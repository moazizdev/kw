/**
 * Import readings or bills from a CSV/JSON file into Prisma Postgres.
 *
 * Usage:
 *   npm run import -- readings.csv
 *   npm run import -- bills.csv
 *   npm run import -- --type readings data/readings.csv
 *   npm run import -- --type bills data/bills.json --dry-run
 *
 * CSV columns are matched case-insensitively and may use spaces or
 * underscores. Accepted headers:
 *   readings: "Date time", "Reading", "Usage", "__id"
 *   bills:    "date", "total_bill", "__id"
 *
 * Rows are upserted, so re-running the same file is safe.
 */
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { parse } from "csv-parse/sync";
import { prisma } from "./prisma-client.ts";

type Dataset = "readings" | "bills";

type Args = {
  file?: string;
  type?: Dataset;
  dryRun: boolean;
};

type SourceRow = Record<string, unknown>;

type ReadingInput = {
  recordedAt: Date;
  reading: number;
  usage: number | null;
  externalId: string | null;
};

type BillInput = {
  billDate: Date;
  period: string;
  totalBill: number;
  externalId: string | null;
};

const READING_DATE_KEYS = [
  "date time",
  "datetime",
  "date",
  "timestamp",
  "recorded at",
  "recordedat",
];
const READING_VALUE_KEYS = ["reading", "meter reading", "reading kwh"];
const USAGE_KEYS = ["usage", "daily usage", "average", "avg"];
const BILL_DATE_KEYS = ["date", "bill date", "billdate", "period"];
const BILL_TOTAL_KEYS = ["total bill", "totalbill", "amount", "cost", "bill"];
const EXTERNAL_ID_KEYS = ["__id", "id", "external id", "externalid"];

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--type") {
      const value = argv[i + 1];
      if (value !== "readings" && value !== "bills") {
        throw new Error('--type must be either "readings" or "bills"');
      }
      args.type = value;
      i += 1;
    } else if (arg === "--file") {
      args.file = argv[i + 1];
      i += 1;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (!arg.startsWith("-")) {
      args.file = arg;
    }
  }

  if (!args.file) {
    throw new Error(
      "No input file. Example: npm run import -- --type readings readings.csv",
    );
  }

  return args;
}

function normalizeKey(key: string): string {
  return key
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, " ");
}

function normalizeRow(row: SourceRow): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeKey(key)] = value;
  }
  return normalized;
}

function pick(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[normalizeKey(key)];
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text !== "") return text;
  }
  return undefined;
}

function parseDate(value: string, label: string): Date {
  const text = value.trim();

  // Google Sheets exports dates as M/D/YYYY, optionally with a time.
  const sheetDate =
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(
      text,
    );

  if (sheetDate) {
    const [, month, day, year, hours = "0", minutes = "0", seconds = "0"] =
      sheetDate;
    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        Number(seconds),
      ),
    );
  }

  // ISO date-times without an offset are treated as UTC so imports are
  // deterministic regardless of the machine timezone.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(text)) {
    return new Date(`${text}Z`);
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label}: "${value}"`);
  }
  return date;
}

function parseNumber(value: string, label: string): number {
  const number = Number(value.replace(/,/g, ""));
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid ${label}: "${value}"`);
  }
  return number;
}

function periodOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function detectType(rows: SourceRow[]): Dataset {
  const keys = new Set(
    rows.flatMap((row) => Object.keys(normalizeRow(row))),
  );

  if (
    READING_DATE_KEYS.some((key) => keys.has(normalizeKey(key))) &&
    READING_VALUE_KEYS.some((key) => keys.has(normalizeKey(key)))
  ) {
    return "readings";
  }

  if (
    BILL_DATE_KEYS.some((key) => keys.has(normalizeKey(key))) &&
    BILL_TOTAL_KEYS.some((key) => keys.has(normalizeKey(key)))
  ) {
    return "bills";
  }

  throw new Error(
    "Could not detect whether this file contains readings or bills. Pass --type readings|bills.",
  );
}

async function readRows(file: string): Promise<SourceRow[]> {
  const content = await readFile(file, "utf8");

  if (extname(file).toLowerCase() === ".json") {
    const parsed = JSON.parse(content) as unknown;
    if (Array.isArray(parsed)) return parsed as SourceRow[];
    if (parsed && typeof parsed === "object") {
      const object = parsed as Record<string, unknown>;
      for (const key of ["readings", "bills", "data", "rows"]) {
        if (Array.isArray(object[key])) return object[key] as SourceRow[];
      }
    }
    throw new Error(
      'JSON must be an array or an object with a "readings", "bills", "data", or "rows" array.',
    );
  }

  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  }) as SourceRow[];
}

function toReadings(rows: SourceRow[]): { rows: ReadingInput[]; skipped: number } {
  const byTimestamp = new Map<number, ReadingInput>();
  let skipped = 0;

  for (const source of rows) {
    const row = normalizeRow(source);

    try {
      const dateText = pick(row, READING_DATE_KEYS);
      const readingText = pick(row, READING_VALUE_KEYS);
      if (!dateText || !readingText) {
        skipped += 1;
        continue;
      }

      const recordedAt = parseDate(dateText, "reading date");
      const usageText = pick(row, USAGE_KEYS);

      byTimestamp.set(recordedAt.getTime(), {
        recordedAt,
        reading: parseNumber(readingText, "reading"),
        usage: usageText ? parseNumber(usageText, "usage") : null,
        externalId: pick(row, EXTERNAL_ID_KEYS) ?? null,
      });
    } catch (error) {
      skipped += 1;
      console.warn(
        `Skipping reading row: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    rows: [...byTimestamp.values()].sort(
      (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
    ),
    skipped,
  };
}

function toBills(rows: SourceRow[]): { rows: BillInput[]; skipped: number } {
  const byPeriod = new Map<string, BillInput>();
  let skipped = 0;

  for (const source of rows) {
    const row = normalizeRow(source);

    try {
      const dateText = pick(row, BILL_DATE_KEYS);
      const totalText = pick(row, BILL_TOTAL_KEYS);
      if (!dateText || !totalText) {
        skipped += 1;
        continue;
      }

      const billDate = parseDate(dateText, "bill date");
      const period = periodOf(billDate);

      // A duplicated month in the source collapses to the last row.
      byPeriod.set(period, {
        billDate,
        period,
        totalBill: parseNumber(totalText, "total bill"),
        externalId: pick(row, EXTERNAL_ID_KEYS) ?? null,
      });
    } catch (error) {
      skipped += 1;
      console.warn(
        `Skipping bill row: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    rows: [...byPeriod.values()].sort(
      (a, b) => a.billDate.getTime() - b.billDate.getTime(),
    ),
    skipped,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function upsertReadings(rows: ReadingInput[], dryRun: boolean) {
  let upserted = 0;
  let failed = 0;

  for (const batch of chunk(rows, 50)) {
    if (dryRun) {
      upserted += batch.length;
      continue;
    }

    await prisma.$transaction(
      batch.map((row) =>
        prisma.reading.upsert({
          where: { recordedAt: row.recordedAt },
          create: row,
          update: {
            reading: row.reading,
            usage: row.usage,
            externalId: row.externalId,
          },
        }),
      ),
      { timeout: 60_000 },
    );

    upserted += batch.length;
  }

  return { upserted, failed };
}

async function upsertBills(rows: BillInput[], dryRun: boolean) {
  let upserted = 0;
  let failed = 0;

  for (const batch of chunk(rows, 50)) {
    if (dryRun) {
      upserted += batch.length;
      continue;
    }

    await prisma.$transaction(
      batch.map((row) =>
        prisma.bill.upsert({
          where: { period: row.period },
          create: row,
          update: {
            billDate: row.billDate,
            totalBill: row.totalBill,
            externalId: row.externalId,
          },
        }),
      ),
      { timeout: 60_000 },
    );

    upserted += batch.length;
  }

  return { upserted, failed };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceRows = await readRows(args.file);
  const type = args.type ?? detectType(sourceRows);
  const converted =
    type === "readings" ? toReadings(sourceRows) : toBills(sourceRows);

  if (converted.rows.length === 0) {
    throw new Error(
      `No valid ${type} rows found in ${args.file}. Check the column names and date formats.`,
    );
  }

  const result =
    type === "readings"
      ? await upsertReadings(converted.rows as ReadingInput[], args.dryRun)
      : await upsertBills(converted.rows as BillInput[], args.dryRun);

  console.log(
    `${args.dryRun ? "Would upsert" : "Upserted"} ${result.upserted} ${type}` +
      (converted.skipped ? ` (${converted.skipped} invalid rows skipped)` : ""),
  );

  if (result.failed) {
    console.warn(`${result.failed} rows failed.`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
