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
const UNRESOLVED_PATH = `${PROJECT_ROOT}/data/unresolved.json`;

// A name that matched nothing is remembered so it isn't re-probed on every
// run — that cost 8 requests per name, daily, forever. Not remembered
// permanently either: companies do move onto a public ATS later, so the
// entry expires and the name gets another chance.
const RETRY_UNRESOLVED_AFTER_DAYS = 30;

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

async function loadUnresolved(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(UNRESOLVED_PATH, "utf-8")) as Record<string, string>;
  } catch {
    return {};
  }
}

function isStillCooling(seenAt: string | undefined): boolean {
  if (!seenAt) return false;
  const ageDays = (Date.now() - new Date(seenAt).getTime()) / (24 * 60 * 60 * 1000);
  return ageDays < RETRY_UNRESOLVED_AFTER_DAYS;
}

async function main() {
  const registry = await loadRegistry();
  const knownNames = new Set(registry.map((c) => c.name.toLowerCase()));
  const knownSlugs = new Set(registry.map((c) => `${c.atsProvider}:${c.atsSlug.toLowerCase()}`));

  const seeds = await loadSeeds();
  const unresolved = await loadUnresolved();
  const notInRegistry = seeds.filter((name) => !knownNames.has(name.toLowerCase()));
  const pending = notInRegistry.filter((name) => !isStillCooling(unresolved[name.toLowerCase()]));
  const cooling = notInRegistry.length - pending.length;

  console.log(
    `seeds: ${seeds.length} total, ${pending.length} to probe` +
      (cooling > 0 ? `, ${cooling} skipped (matched nothing within ${RETRY_UNRESOLVED_AFTER_DAYS}d)` : ""),
  );

  let added = 0;
  for (const name of pending) {
    console.log(`\nresolving: ${name}`);
    const matches = await resolveCompany(name);

    if (matches.length === 0) {
      console.log("  no match on any ATS");
      unresolved[name.toLowerCase()] = new Date().toISOString();
      continue;
    }
    delete unresolved[name.toLowerCase()];

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

  await writeFile(UNRESOLVED_PATH, JSON.stringify(unresolved, null, 2));
  await writeFile(COMPANIES_PATH, JSON.stringify(registry, null, 2));
  console.log(`\nregistry: ${registry.length} companies (${added} new)`);
}

main();
