-- Initial schema: readings and bills replace the two Google Sheets.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "readings" (
    "id" SERIAL NOT NULL,
    "external_id" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "reading" DOUBLE PRECISION NOT NULL,
    "usage" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "readings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bills" (
    "id" SERIAL NOT NULL,
    "external_id" TEXT,
    "period" TEXT NOT NULL,
    "bill_date" TIMESTAMP(3) NOT NULL,
    "total_bill" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "readings_external_id_key" ON "readings"("external_id");
CREATE UNIQUE INDEX "readings_recorded_at_key" ON "readings"("recorded_at");
CREATE UNIQUE INDEX "bills_external_id_key" ON "bills"("external_id");
CREATE UNIQUE INDEX "bills_period_key" ON "bills"("period");
CREATE INDEX "bills_bill_date_idx" ON "bills"("bill_date");
