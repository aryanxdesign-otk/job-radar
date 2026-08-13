// SmartRecruiters postings API adapter.
// Docs: https://api.smartrecruiters.com/v1/companies/{id}/postings?q=&country=&limit=&offset=
//
// Tier-dependent: not every customer has the Postings API enabled. In practice this
// API returns HTTP 200 with totalFound: 0 for both "no postings" and "wrong/unknown
// company id" rather than a 404 — either way, zero jobs is not an error, just an
// empty result. A real 404 (if the API ever returns one) is treated the same way.
//
// The listing endpoint doesn't include job descriptions (that needs a per-job detail
// call to /postings/{id}) — deliberately skipped here to avoid N+1 requests across
// thousands of raw listings. Descriptions can be fetched lazily later, only for the
// small set of jobs that survive Stage 1 filtering.

import type { Job } from "../types/job.js";
import { titleCase, sleep } from "../lib/util.js";

interface SmartRecruitersLocation {
  city?: string;
  region?: string;
  country?: string;
  fullLocation?: string;
}

interface SmartRecruitersCompany {
  identifier: string;
  name: string;
}

interface SmartRecruitersPosting {
  id: string;
  name: string;
  releasedDate: string;
  location?: SmartRecruitersLocation;
  company: SmartRecruitersCompany;
}

interface SmartRecruitersResponse {
  totalFound: number;
  content: SmartRecruitersPosting[];
}

const PAGE_SIZE = 100;

async function fetchPage(companyId: string, offset: number): Promise<SmartRecruitersResponse | null> {
  const url = `https://api.smartrecruiters.com/v1/companies/${companyId}/postings?limit=${PAGE_SIZE}&offset=${offset}`;
  const res = await fetch(url);

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`smartrecruiters:${companyId}: HTTP ${res.status}`);
  }

  return (await res.json()) as SmartRecruitersResponse;
}

function normalize(posting: SmartRecruitersPosting, companyId: string): Job {
  return {
    id: `smartrecruiters:${companyId}:${posting.id}`,
    atsProvider: "smartrecruiters" as const,
    company: posting.company?.name || titleCase(companyId),
    title: posting.name,
    location: posting.location?.fullLocation ?? "",
    url: `https://jobs.smartrecruiters.com/${companyId}/${posting.id}`,
    postedAt: posting.releasedDate,
    description: "",
  };
}

export async function fetchSmartRecruitersJobs(companyId: string): Promise<Job[]> {
  const jobs: Job[] = [];
  let offset = 0;

  while (true) {
    const page = await fetchPage(companyId, offset);
    if (page === null) break;

    jobs.push(...page.content.map((posting) => normalize(posting, companyId)));

    offset += page.content.length;
    if (page.content.length < PAGE_SIZE || offset >= page.totalFound) break;

    await sleep(1000); // 1 req/sec politeness between pages
  }

  return jobs;
}
