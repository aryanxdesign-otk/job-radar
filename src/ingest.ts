import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Job } from "./types/job.js";
import type { CompanyRecord } from "./types/company.js";
import { fetchGreenhouseJobs } from "./adapters/greenhouse.js";
import { fetchLeverJobs } from "./adapters/lever.js";
import { fetchAshbyJobs } from "./adapters/ashby.js";
import { fetchPersonioJobs } from "./adapters/personio.js";
import { fetchTeamtailorJobs } from "./adapters/teamtailor.js";
import { fetchRecruiteeJobs } from "./adapters/recruitee.js";
import { fetchWorkableJobs } from "./adapters/workable.js";
import { fetchSmartRecruitersJobs } from "./adapters/smartrecruiters.js";
import { fetchRemoteOkJobs } from "./adapters/remoteok.js";
import { fetchWeWorkRemotelyJobs } from "./adapters/weworkremotely.js";
import { fetchRemotiveJobs } from "./adapters/remotive.js";
import { fetchWorkingNomadsJobs } from "./adapters/workingnomads.js";
import { fetchRemoteJobsPlaceJobs } from "./adapters/remotejobsplace.js";
import { fetchJobspressoJobs } from "./adapters/jobspresso.js";
import { fetchWeb3CareerJobs } from "./adapters/web3career.js";
import { fetchRemote3Jobs } from "./adapters/remote3.js";
import { fetchDesignXJobs } from "./adapters/designx.js";
import { dedupeJobs } from "./lib/dedupe.js";
import { sleep } from "./lib/util.js";

type AggregatorSource =
  | { provider: "remoteok"; token: string }
  | { provider: "weworkremotely"; token: string }
  | { provider: "remotive"; token: string }
  | { provider: "workingnomads"; token: string }
  | { provider: "remotejobsplace"; token: string }
  | { provider: "jobspresso"; token: string }
  | { provider: "web3career"; token: string }
  | { provider: "remote3"; token: string }
  | { provider: "designx"; token: string };

const AGGREGATOR_SOURCES: AggregatorSource[] = [
  { provider: "remoteok", token: "" },
  { provider: "weworkremotely", token: "remote-design-jobs" },
  { provider: "weworkremotely", token: "remote-product-jobs" },
  { provider: "remotive", token: "" },
  { provider: "workingnomads", token: "" },
  { provider: "remotejobsplace", token: "" },
  { provider: "jobspresso", token: "design" },
  { provider: "jobspresso", token: "product+owner" },
  { provider: "web3career", token: "product-designer-jobs" },
  { provider: "remote3", token: "remote-web3-jobs" },
  { provider: "designx", token: "" },
];

async function fetchAggregator(source: AggregatorSource): Promise<Job[]> {
  switch (source.provider) {
    case "remoteok":
      return fetchRemoteOkJobs();
    case "weworkremotely":
      return fetchWeWorkRemotelyJobs(source.token);
    case "remotive":
      return fetchRemotiveJobs();
    case "workingnomads":
      return fetchWorkingNomadsJobs();
    case "remotejobsplace":
      return fetchRemoteJobsPlaceJobs();
    case "jobspresso":
      return fetchJobspressoJobs(source.token);
    case "web3career":
      return fetchWeb3CareerJobs(source.token);
    case "remote3":
      return fetchRemote3Jobs(source.token);
    case "designx":
      return fetchDesignXJobs();
  }
}

async function fetchCompany(company: CompanyRecord): Promise<Job[]> {
  switch (company.atsProvider) {
    case "greenhouse":
      return fetchGreenhouseJobs(company.atsSlug);
    case "lever":
      return fetchLeverJobs(company.atsSlug);
    case "ashby":
      return fetchAshbyJobs(company.atsSlug);
    case "personio":
      return fetchPersonioJobs(company.atsSlug);
    case "teamtailor":
      return fetchTeamtailorJobs(company.atsSlug);
    case "recruitee":
      return fetchRecruiteeJobs(company.atsSlug);
    case "workable":
      return fetchWorkableJobs(company.atsSlug);
    case "smartrecruiters":
      return fetchSmartRecruitersJobs(company.atsSlug);
  }
}

const PROJECT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA_PATH = `${PROJECT_ROOT}/data/jobs.json`;
const COMPANIES_PATH = `${PROJECT_ROOT}/data/companies.json`;
const FIRST_SEEN_PATH = `${PROJECT_ROOT}/data/first-seen.json`;
const DORMANT_AFTER_DAYS = 180;

async function loadRegistry(): Promise<CompanyRecord[]> {
  const raw = await readFile(COMPANIES_PATH, "utf-8");
  return JSON.parse(raw) as CompanyRecord[];
}

/**
 * Some boards publish no date at all. Those adapters leave postedAt empty and
 * we date the job from the first run that saw it — stamping "now" each run
 * would keep re-dating the posting, so it would sit at the top forever and
 * never age out of the recency window.
 *
 * The dates live in their own ledger rather than being read back out of
 * jobs.json, because filter.ts rewrites that file with only the survivors: a
 * job that aged out would lose its date and come back as new on the next run.
 */
async function backfillPostedAt(jobs: Job[]): Promise<number> {
  let ledger: Record<string, string> = {};
  try {
    ledger = JSON.parse(await readFile(FIRST_SEEN_PATH, "utf-8")) as Record<string, string>;
  } catch {
    // No ledger yet; everything undated is new today.
  }

  const now = new Date().toISOString();
  let backfilled = 0;
  for (const job of jobs) {
    if (job.postedAt) continue;
    ledger[job.id] ??= now;
    job.postedAt = ledger[job.id]!;
    backfilled++;
  }

  // Keep the ledger from growing without bound; well past the 21-day window.
  const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
  for (const [id, seen] of Object.entries(ledger)) {
    if (new Date(seen).getTime() < cutoff) delete ledger[id];
  }

  await writeFile(FIRST_SEEN_PATH, JSON.stringify(ledger, null, 2));
  return backfilled;
}

function daysSince(iso: string | null): number {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000);
}

async function main() {
  const registry = await loadRegistry();
  const activeCompanies = registry.filter((c) => c.status === "active");
  const skipped = registry.length - activeCompanies.length;

  console.log(`companies: ${registry.length} in registry, ${activeCompanies.length} active, ${skipped} skipped (dormant/unsupported)`);

  const allJobs: Job[] = [];

  for (const company of activeCompanies) {
    try {
      const jobs = await fetchCompany(company);
      console.log(`${company.atsProvider}:${company.atsSlug} — ${jobs.length} jobs`);
      allJobs.push(...jobs);

      if (jobs.length > 0) {
        company.lastSeenJobsAt = new Date().toISOString();
      } else if (daysSince(company.lastSeenJobsAt ?? company.addedAt) > DORMANT_AFTER_DAYS) {
        company.status = "dormant";
        console.log(`  -> marked dormant (0 jobs for ${DORMANT_AFTER_DAYS}+ days)`);
      }
    } catch (err) {
      console.error(`  failed: ${(err as Error).message}`);
    }

    await sleep(1000); // 1 req/sec politeness
  }

  for (const source of AGGREGATOR_SOURCES) {
    try {
      const jobs = await fetchAggregator(source);
      console.log(`${source.provider}:${source.token} — ${jobs.length} jobs`);
      allJobs.push(...jobs);
    } catch (err) {
      console.error(`  failed: ${(err as Error).message}`);
    }

    await sleep(1000);
  }

  const backfilled = await backfillPostedAt(allJobs);
  const deduped = dedupeJobs(allJobs);

  console.log(`\nraw: ${allJobs.length} — deduped: ${deduped.length} (${allJobs.length - deduped.length} dropped)`);
  if (backfilled > 0) console.log(`dated ${backfilled} undated job(s) from first-seen`);

  console.log("\nsample:");
  for (const job of deduped.slice(0, 10)) {
    console.log(`  [${job.atsProvider}] ${job.company} — ${job.title} — ${job.location}`);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    funnel: { raw: allJobs.length, deduped: deduped.length },
    jobs: deduped,
  };

  await mkdir(dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(output, null, 2));
  await writeFile(COMPANIES_PATH, JSON.stringify(registry, null, 2));
  console.log(`\nwrote ${deduped.length} jobs to data/jobs.json, updated registry`);
}

main();
