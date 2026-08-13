// Stage 1 hard filter (SPEC.md Phase 3). Rule-based, no LLM — reads the raw
// deduped data/jobs.json from ingest.ts, applies role-family/seniority, geo,
// and recency rules, and overwrites data/jobs.json with the survivors, each
// tagged with its roleFamily. Logs funnel counts so volume loss is visible.

import { readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Job } from "./types/job.js";
import { classifyRole, type RoleFamily } from "./lib/roleFilter.js";
import { isGeoRejected } from "./lib/geoFilter.js";

const PROJECT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA_PATH = `${PROJECT_ROOT}/data/jobs.json`;
const MAX_AGE_DAYS = 21;

interface JobsFile {
  generatedAt: string;
  funnel: Record<string, number>;
  jobs: Job[];
}

export interface FilteredJob extends Job {
  roleFamily: RoleFamily;
}

function isRecent(postedAt: string): boolean {
  const posted = new Date(postedAt).getTime();
  if (Number.isNaN(posted)) return true; // don't punish sources with unparseable dates
  const ageDays = (Date.now() - posted) / (24 * 60 * 60 * 1000);
  return ageDays <= MAX_AGE_DAYS;
}

async function main() {
  const raw = await readFile(DATA_PATH, "utf-8");
  const data = JSON.parse(raw) as JobsFile;

  const titleMatched: FilteredJob[] = [];
  for (const job of data.jobs) {
    const roleFamily = classifyRole(job.title);
    if (roleFamily) titleMatched.push({ ...job, roleFamily });
  }

  const recencyPassed = titleMatched.filter((job) => isRecent(job.postedAt));
  const geoPassed = recencyPassed.filter((job) => !isGeoRejected(job.location, job.description));

  const funnel = {
    ...data.funnel,
    titleMatched: titleMatched.length,
    recencyPassed: recencyPassed.length,
    geoPassed: geoPassed.length,
  };

  console.log("funnel:");
  for (const [stage, count] of Object.entries(funnel)) {
    console.log(`  ${stage}: ${count}`);
  }

  const byFamily: Record<RoleFamily, number> = { "senior-pd": 0, "lead-pd": 0, uiux: 0, "product-owner": 0 };
  for (const job of geoPassed) byFamily[job.roleFamily]++;
  console.log("\nby role family:");
  for (const [family, count] of Object.entries(byFamily)) {
    console.log(`  ${family}: ${count}`);
  }

  const output = {
    generatedAt: data.generatedAt,
    filteredAt: new Date().toISOString(),
    funnel,
    jobs: geoPassed,
  };

  await writeFile(DATA_PATH, JSON.stringify(output, null, 2));
  console.log(`\nwrote ${geoPassed.length} filtered jobs to data/jobs.json`);
}

main();
