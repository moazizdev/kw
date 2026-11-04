# Electricity Usage Monitor

A bilingual (Arabic / English) electricity usage dashboard. The two Google
Sheets are replaced by a **Prisma Postgres** database, and the dashboard is
published as a static site on **GitHub Pages**.

## Why the data is exported to JSON

GitHub Pages only serves static files. A browser must never receive the
Postgres connection string, so the site cannot query Postgres directly.

The flow is:

```
Prisma Postgres
      │  Prisma ORM (server-side only)
      ▼
GitHub Actions  ──exports──▶  data/dashboard.json
      │
      ▼
GitHub Pages (index.html + scripts.js + dashboard.json)
```

The GitHub Actions workflow runs on every push, every 6 hours, and on demand.
It applies migrations, exports both tables, and deploys the snapshot. To
refresh the live site after changing the database, run the workflow manually
(**Actions → Deploy dashboard → Run workflow**) or wait for the schedule.

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Add your connection string

```bash
cp .env.example .env
```

Open `.env` and paste the connection string from the Prisma Console
(**your database → Connect to your database**):

```dotenv
DATABASE_URL="postgres://USER:PASSWORD@db.prisma.io:5432/postgres?sslmode=require"
```

Keep `.env` private. It is already ignored by Git.

### 3. Create the tables

```bash
npm run db:migrate
```

If your connection string is pooled and the migration fails, copy the direct
(non-pooled) connection string into `DIRECT_URL` in `.env` and run the command
again.

### 4. Import your rows

The importer accepts CSV or JSON and detects the dataset from the column names.
It upserts rows, so running it twice is safe.

```bash
# Readings: "Date time", "Reading", "Usage", "__id"
npm run import -- --type readings path/to/readings.csv

# Bills: "date", "total_bill", "__id"
npm run import -- --type bills path/to/bills.csv
```

Preview without writing:

```bash
npm run import -- --type readings path/to/readings.csv --dry-run
```

Column aliases are accepted (for example `date`/`timestamp`, `total_bill`/
`total bill`/`amount`, `__id`/`id`). Dates may be `M/D/YYYY`, `M/D/YYYY
H:mm:ss`, or ISO. Duplicate reading timestamps and duplicate bill months are
collapsed (the last row wins), which fixes the duplicated `2025-06` bill from
the old sheet.

### 5. Export and preview

```bash
npm run sync   # writes data/dashboard.json from Postgres
npm run dev    # http://localhost:4173
```

`npm run dev` serves the files over HTTP. Opening `index.html` directly with
`file://` will not work because the browser blocks `fetch()`.

## Deploy to GitHub Pages

1. Push the repository to GitHub.
2. Add the database secret:
   **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `DATABASE_URL`
   - Value: your Prisma Postgres connection string
   - Optional: `DIRECT_URL` if migrations need a non-pooled connection.
3. Enable Pages:
   **Settings → Pages → Build and deployment → Source: GitHub Actions**
4. Run **Actions → Deploy dashboard → Run workflow** (or push to `main`).

The workflow publishes only `dist/` (the HTML, CSS, JS, and the generated
`data/dashboard.json`). No Prisma client or secret is uploaded.

## Commands

| Command | What it does |
| --- | --- |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Apply migrations to Postgres |
| `npm run db:push` | Push the schema without a migration (quick dev setup) |
| `npm run db:studio` | Open Prisma Studio to edit rows |
| `npm run import -- …` | Import a CSV/JSON file |
| `npm run sync` | Export Postgres → `data/dashboard.json` |
| `npm run build` | Build `dist/` for GitHub Pages |
| `npm run dev` | Local static preview |

## Data model

`readings`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | serial | Primary key |
| `external_id` | text, unique, nullable | Original sheet `__id` |
| `recorded_at` | timestamp, unique | Meter reading time |
| `reading` | double precision | Cumulative meter value |
| `usage` | double precision, nullable | Daily average from the sheet |
| `created_at` | timestamp | Import time |

`bills`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | serial | Primary key |
| `external_id` | text, unique, nullable | Original sheet `__id` |
| `period` | text, unique | `YYYY-MM`; one bill per month |
| `bill_date` | timestamp | Bill date |
| `total_bill` | double precision | Amount in EGP |
| `created_at` | timestamp | Import time |

## Fixed dashboard issues

- The summary window is anchored to the **newest reading**, not to today. The
  old code used today's date, so a database that ended in September showed
  "not enough data" in November.
- Bills are joined by a unique `YYYY-MM` period, so the duplicate June 2025 bill
  no longer overwrites the chart unpredictably.
- The Arabic and English views share one fetch instead of downloading both
  sheets twice.
- The chart instance is destroyed before redrawing, avoiding duplicate Chart.js
  instances when switching the 6/12/24-month period.
- Dates are displayed in UTC, matching the wall-clock times stored from the
  sheets.

## Troubleshooting

**The dashboard says "Not enough readings"**
The database is empty or has fewer than two readings in the last 30 days.
Import rows and run `npm run sync`.

**`prisma migrate deploy` fails**
Use the direct connection string in `DIRECT_URL`. Pooled connections can fail
during migrations.

**The GitHub Action fails with "Missing DATABASE_URL"**
Add the repository secret described above. Secrets are not available to
workflows triggered from forks.

**I changed the database but the site did not update**
The site is a snapshot. Run the workflow manually or wait for the 6-hour
schedule.
