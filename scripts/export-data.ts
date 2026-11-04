/**
 * Export the two Postgres tables to the static JSON file the dashboard reads.
 *
 * Run locally:  npm run sync
 * In CI:        DATABASE_URL is provided by the GitHub Actions secret.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { prisma } from "./prisma-client.ts";

async function main() {
  // Run the two queries sequentially. It is slightly slower on a real
  // database and avoids opening two connections at once on single-connection
  // local Postgres servers.
  const readings = await prisma.reading.findMany({
    orderBy: { recordedAt: "asc" },
  });
  const bills = await prisma.bill.findMany({ orderBy: { billDate: "asc" } });

  const payload = {
    generatedAt: new Date().toISOString(),
    meta: {
      readingCount: readings.length,
      billCount: bills.length,
    },
    readings: readings.map((row) => ({
      timestamp: row.recordedAt.toISOString(),
      reading: row.reading,
      ...(row.usage === null ? {} : { usage: row.usage }),
    })),
    bills: bills.map((row) => ({
      date: row.billDate.toISOString(),
      period: row.period,
      totalBill: row.totalBill,
    })),
  };

  await mkdir("data", { recursive: true });
  await writeFile(
    "data/dashboard.json",
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Wrote data/dashboard.json (${readings.length} readings, ${bills.length} bills).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
