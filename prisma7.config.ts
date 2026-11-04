// Prisma 7 config. Prisma 7.10 discovers this file name; Prisma 8 uses
// prisma.config.ts instead.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT_URL when it exists (migrations through a pooled connection
    // can fail), otherwise fall back to the normal connection string.
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
