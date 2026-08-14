// Phase 2 registry bootstrap — path 3 (manual CSV seeds) for now.
// Paths 1 (public slug lists) and 2 (corpus-based probing) land separately.
//
// Reads data/seeds.csv (one company name per line, header "name"), resolves
// each against all 8 per-company ATS types via src/lib/resolve.ts, and merges
// any matches into data/companies.json. Idempotent: names already present in
// the registry are skipped.

import { readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { CompanyRecord } from "./types/company.js";
import { resolveCompany } from "./lib/resolve.js";

const PROJECT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const COMPANIES_PATH = `${PROJECT_ROOT}/data/companies.json`;
const SEEDS_PATH = `${PROJECT_ROOT}/data/seeds.csv`;

async function loadRegistry(): Promise<CompanyRecord[]> {
  try {
    const raw = await readFile(COMPANIES_PATH, "utf-8");
    return JSON.parse(raw) as CompanyRecord[];
  } catch {
    return [];
  }
}

async function loadSeeds(): Promise<string[]> {
  const raw = await readFile(SEEDS_PATH, "utf-8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.toLowerCase() !== "name");
}

async function main() {
  const registry = await loadRegistry();
  const knownNames = new Set(registry.map((c) => c.name.toLowerCase()));
  const knownSlugs = new Set(registry.map((c) => `${c.atsProvider}:${c.atsSlug.toLowerCase()}`));

  const seeds = await loadSeeds();
  const pending = seeds.filter((name) => !knownNames.has(name.toLowerCase()));

  console.log(`seeds: ${seeds.length} total, ${pending.length} not yet in registry`);

  let added = 0;
  for (const name of pending) {
    console.log(`\nresolving: ${name}`);
    const matches = await resolveCompany(name);

    if (matches.length === 0) {
      console.log("  no match on any ATS");
      continue;
    }

    for (const match of matches) {
      const key = `${match.atsProvider}:${match.atsSlug.toLowerCase()}`;
      if (knownSlugs.has(key)) {
        console.log(`  ${match.atsProvider}:${match.atsSlug} already in registry, skipping`);
        continue;
      }
      knownSlugs.add(key);
      registry.push({
        name,
        atsProvider: match.atsProvider,
        atsSlug: match.atsSlug,
        region: "unknown",
        tags: [],
        addedAt: new Date().toISOString(),
        lastSeenJobsAt: null,
        status: "active",
      });
      added++;
      console.log(`  matched: ${match.atsProvider}:${match.atsSlug}`);
    }
  }

  await writeFile(COMPANIES_PATH, JSON.stringify(registry, null, 2));
  console.log(`\nregistry: ${registry.length} companies (${added} new)`);
}

main();
