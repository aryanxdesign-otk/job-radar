import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Job } from "./types/job.js";
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

type Source =
  | { provider: "greenhouse"; token: string }
  | { provider: "lever"; token: string }
  | { provider: "ashby"; token: string }
  | { provider: "personio"; token: string }
  | { provider: "teamtailor"; token: string }
  | { provider: "recruitee"; token: string }
  | { provider: "workable"; token: string }
  | { provider: "smartrecruiters"; token: string }
  | { provider: "remoteok"; token: string }
  | { provider: "weworkremotely"; token: string }
  | { provider: "remotive"; token: string }
  | { provider: "workingnomads"; token: string }
  | { provider: "remotejobsplace"; token: string }
  | { provider: "jobspresso"; token: string }
  | { provider: "web3career"; token: string }
  | { provider: "remote3"; token: string }
  | { provider: "designx"; token: string };

const SOURCES: Source[] = [
  { provider: "greenhouse", token: "stripe" },
  { provider: "greenhouse", token: "airbnb" },
  { provider: "greenhouse", token: "coinbase" },
  { provider: "greenhouse", token: "figma" },
  { provider: "lever", token: "palantir" },
  { provider: "lever", token: "gopuff" },
  { provider: "ashby", token: "ashby" },
  { provider: "ashby", token: "linear" },
  { provider: "personio", token: "urbansportsclub" },
  { provider: "personio", token: "clark" },
  { provider: "teamtailor", token: "storytel" },
  { provider: "teamtailor", token: "lunar" },
  { provider: "recruitee", token: "channable" },
  { provider: "recruitee", token: "bunq" },
  { provider: "workable", token: "justpark" },
  { provider: "workable", token: "zego" },
  { provider: "smartrecruiters", token: "SmartRecruiters" },
  { provider: "smartrecruiters", token: "DeliveryHero" },
  { provider: "smartrecruiters", token: "ThisCompanyDoesNotExist" },
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

async function fetchSource(source: Source): Promise<Job[]> {
  switch (source.provider) {
    case "greenhouse":
      return fetchGreenhouseJobs(source.token);
    case "lever":
      return fetchLeverJobs(source.token);
    case "ashby":
      return fetchAshbyJobs(source.token);
    case "personio":
      return fetchPersonioJobs(source.token);
    case "teamtailor":
      return fetchTeamtailorJobs(source.token);
    case "recruitee":
      return fetchRecruiteeJobs(source.token);
    case "workable":
      return fetchWorkableJobs(source.token);
    case "smartrecruiters":
      return fetchSmartRecruitersJobs(source.token);
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

const PROJECT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA_PATH = `${PROJECT_ROOT}/data/jobs.json`;

async function main() {
  const allJobs: Job[] = [];

  for (const source of SOURCES) {
    try {
      const jobs = await fetchSource(source);
      console.log(`${source.provider}:${source.token} — ${jobs.length} jobs`);
      allJobs.push(...jobs);
    } catch (err) {
      console.error(`  failed: ${(err as Error).message}`);
    }

    await sleep(1000); // 1 req/sec politeness
  }

  const deduped = dedupeJobs(allJobs);

  console.log(`\nraw: ${allJobs.length} — deduped: ${deduped.length} (${allJobs.length - deduped.length} dropped)`);

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
  console.log(`\nwrote ${deduped.length} jobs to data/jobs.json`);
}

main();
