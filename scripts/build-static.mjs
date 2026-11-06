/**
 * Assemble the static site that GitHub Pages will publish.
 * Only browser-safe files are copied; no Prisma client or secrets.
 */
import { cp, mkdir, rm, writeFile } from "node:fs/promises";

const STATIC_FILES = ["index.html", "styles.css", "scripts.js", "config.js"];
const STATIC_DIRS = ["data"];

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

for (const file of STATIC_FILES) {
  await cp(file, `dist/${file}`);
}

for (const dir of STATIC_DIRS) {
  await cp(dir, `dist/${dir}`, { recursive: true });
}

// Optional: inject the live API URL during the GitHub Actions build without
// committing it to the source tree. If unset, config.js keeps the static
// data/dashboard.json fallback.
const apiUrl = (process.env.KW_API_URL || "").trim().replace(/\/+$/, "");
if (apiUrl) {
  await writeFile(
    "dist/config.js",
    `window.KW_DASHBOARD_API = ${JSON.stringify(apiUrl)};\n`,
  );
}

// Tell GitHub Pages not to run Jekyll over the exported files.
await writeFile("dist/.nojekyll", "");

console.log("Built dist/ for GitHub Pages.");
