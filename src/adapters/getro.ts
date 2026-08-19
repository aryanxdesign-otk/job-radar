// Getro powers the talent boards of a large number of VC firms, all behind
// one API shape, so a single adapter reaches every portfolio company on them
// without needing each company in the registry.
//
// Worth having for two reasons: the boards are curated, so a much higher
// share of listings are current than on a general feed, and the European
// funds' portfolios sit natively in the timezone band.
//
// Two API quirks, both load-bearing:
//   - Accept: application/json is mandatory; without it every call 406s.
//   - hitsPerPage is ignored. Pages are always 20, so it has to paginate.
//
// The list response carries no description — has_description is a flag, not
// the text — so jobs arrive without one and the detail sheet falls back to
// pointing at the original posting.

import type { Job } from "../types/job.js";
import { sleep } from "../lib/util.js";

/** Fund talent boards, discovered by reading network.id off each board. */
export const GETRO_NETWORKS: [name: string, id: number][] = [
  ["point-nine", 1680],
  ["accel", 8672],
  ["earlybird", 617],
  ["hv-capital", 234],
  ["seedcamp", 4186],
  ["byfounders", 248],
  ["insight-partners", 246],
  ["general-catalyst", 222],
  ["dawn-capital", 3063],
  ["mmc-ventures", 2303],
];

const PAGE_SIZE = 20;
const MAX_PAGES = 8;

interface GetroJob {
  id: number;
  title: string;
  url: string;
  created_at: number; // unix seconds
  locations?: string[];
  organization?: { name?: string };
}

interface GetroResponse {
  results?: { jobs?: GetroJob[]; count?: number };
}

async function searchPage(networkId: number, query: string, page: number): Promise<GetroResponse | null> {
  const res = await fetch(`https://api.getro.com/api/v2/collections/${networkId}/search/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "job-radar (personal use; contact: aryanchillal@gmail.com)",
    },
    body: JSON.stringify({ hitsPerPage: PAGE_SIZE, page, query }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) throw new Error(`getro:${networkId}: HTTP ${res.status}`);
  return (await res.json()) as GetroResponse;
}

function normalize(job: GetroJob, network: string): Job {
  return {
    id: `getro:${network}:${job.id}`,
    atsProvider: "getro" as const,
    company: job.organization?.name || "Unknown",
    title: job.title,
    location: (job.locations ?? []).join(", "),
    url: job.url,
    postedAt: new Date(job.created_at * 1000).toISOString(),
    description: "",
  };
}

/** Searches one fund's board for a term, paging until exhausted. */
export async function fetchGetroJobs(network: string, networkId: number, query: string): Promise<Job[]> {
  const jobs: Job[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await searchPage(networkId, query, page);
    const batch = data?.results?.jobs ?? [];
    jobs.push(...batch.map((job) => normalize(job, network)));

    const total = data?.results?.count ?? 0;
    if (batch.length < PAGE_SIZE || jobs.length >= total) break;

    await sleep(1000); // every network shares api.getro.com — 1 req/sec
  }

  return jobs;
}
