/**
 * Read-only dashboard API.
 *
 * Cloudflare Worker that reads the dashboard data from Prisma Postgres and
 * returns the same JSON shape as `data/dashboard.json`. The database URL is a
 * Worker secret and is never sent to the browser.
 */

import pg from "pg";

type PgClient = {
  connect(): Promise<void>;
  end(): Promise<void>;
  query(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: Record<string, unknown>[] }>;
};

const { Client } = pg as unknown as {
  Client: new (config: { connectionString: string }) => PgClient;
};

type Env = {
  DATABASE_URL: string;
  ALLOWED_ORIGIN?: string;
};

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const configured = (
    env.ALLOWED_ORIGIN ||
    "https://moazizdev.github.io,http://localhost:4173,http://127.0.0.1:4173"
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const origin = request.headers.get("Origin");
  const allowOrigin =
    origin && configured.includes(origin) ? origin : configured[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

async function withDb<T>(
  env: Env,
  callback: (client: PgClient) => Promise<T>,
): Promise<T> {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured on the Worker.");
  }

  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  try {
    return await callback(client);
  } finally {
    try {
      await client.end();
    } catch {
      // Ignore shutdown errors.
    }
  }
}

async function loadDashboard(env: Env) {
  return withDb(env, async (client) => {
    const readings = await client.query(
      `SELECT
         to_char(recorded_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS timestamp,
         reading,
         usage
       FROM readings
       ORDER BY recorded_at ASC`,
    );

    const bills = await client.query(
      `SELECT
         to_char(bill_date, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS date,
         period,
         total_bill AS "totalBill"
       FROM bills
       ORDER BY bill_date ASC`,
    );

    return {
      generatedAt: new Date().toISOString(),
      meta: {
        readingCount: readings.rows.length,
        billCount: bills.rows.length,
      },
      readings: readings.rows,
      bills: bills.rows,
    };
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (request.method === "GET" && path === "/api/dashboard") {
        const data = await loadDashboard(env);
        const response = json(data);
        for (const [name, value] of Object.entries(cors)) {
          response.headers.set(name, value);
        }
        return response;
      }

      if (request.method === "GET" && path === "/api/health") {
        const response = json({
          ok: true,
          time: new Date().toISOString(),
        });
        for (const [name, value] of Object.entries(cors)) {
          response.headers.set(name, value);
        }
        return response;
      }

      const response = json({ error: "Not found." }, 404);
      for (const [name, value] of Object.entries(cors)) {
        response.headers.set(name, value);
      }
      return response;
    } catch (error) {
      console.error("Dashboard API failed", error);
      const response = json({ error: "Could not load dashboard data." }, 502);
      for (const [name, value] of Object.entries(cors)) {
        response.headers.set(name, value);
      }
      return response;
    }
  },
};
