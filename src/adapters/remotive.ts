// Remotive public API adapter.
// Docs: https://remotive.com/api/remote-jobs
// ToS asks for: a max of ~4 requests/day, a visible backlink + "Remotive" source
// attribution per job, and no re-syndication to other third-party job boards
// (they name Jooble/Google Jobs/LinkedIn Jobs — bulk aggregators, not a personal
// single-user tool). Keep the daily cron to a single call per run.

import type { Job } from "../types/job.js";

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  candidate_required_location?: string;
  publication_date: string;
  description?: string;
}

interface RemotiveResponse {
  jobs: RemotiveJob[];
}

export async function fetchRemotiveJobs(): Promise<Job[]> {
  const res = await fetch("https://remotive.com/api/remote-jobs");

  if (!res.ok) {
    throw new Error(`remotive: HTTP ${res.status}`);
  }

  const data = (await res.json()) as RemotiveResponse;

  return data.jobs.map((job) => ({
    id: `remotive:${job.id}`,
    atsProvider: "remotive" as const,
    company: job.company_name,
    title: job.title,
    location: job.candidate_required_location ?? "",
    url: job.url,
    postedAt: job.publication_date,
    description: job.description ?? "",
  }));
}
