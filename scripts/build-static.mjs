/**
 * Assemble the static site that GitHub Pages will publish.
 * Only browser-safe files are copied; no Prisma client or secrets.
 */
import { cp, mkdir, rm, writeFile } from "node:fs/promises";

const STATIC_FILES = ["index.html", "styles.css", "scripts.js"];
const STATIC_DIRS = ["data"];

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

for (const file of STATIC_FILES) {
  await cp(file, `dist/${file}`);
}

for (const dir of STATIC_DIRS) {
  await cp(dir, `dist/${dir}`, { recursive: true });
}

// Tell GitHub Pages not to run Jekyll over the exported files.
await writeFile("dist/.nojekyll", "");

console.log("Built dist/ for GitHub Pages.");
