// Ensures site/public/jobs.json is a real file (not just the dev-time symlink)
// before a production build, so deployment platforms that build from the
// site/ subdirectory (Vercel, Netlify) have the data available.
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const projectRoot = dirname(siteRoot);

const source = join(projectRoot, "data", "jobs.json");
const dest = join(siteRoot, "public", "jobs.json");

mkdirSync(dirname(dest), { recursive: true });
// dest may currently be a symlink (dev-mode convenience) — remove it first so
// this writes a real, independent file rather than following the symlink
// back onto the source.
rmSync(dest, { force: true });
copyFileSync(source, dest);
console.log("copied data/jobs.json -> site/public/jobs.json");
