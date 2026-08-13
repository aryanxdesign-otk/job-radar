// Ashby job board API adapter.
// Docs: https://api.ashbyhq.com/posting-api/job-board/{name}?includeCompensation=true

import type { Job } from "../types/job.js";
import { titleCase } from "../lib/util.js";

interface AshbyJob {
  id: string;
  title: string;
  location: string;
  jobUrl: string;
  publishedAt: string;
  descriptionPlain?: string;
  descriptionHtml?: string;
}

interface AshbyBoardResponse {
  jobs: AshbyJob[];
}

export async function fetchAshbyJobs(boardName: string): Promise<Job[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${boardName}?includeCompensation=true`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`ashby:${boardName}: HTTP ${res.status}`);
  }

  const data = (await res.json()) as AshbyBoardResponse;

  return data.jobs.map((job) => ({
    id: `ashby:${boardName}:${job.id}`,
    atsProvider: "ashby" as const,
    company: titleCase(boardName),
    title: job.title,
    location: job.location ?? "",
    url: job.jobUrl,
    postedAt: job.publishedAt,
    description: job.descriptionPlain ?? job.descriptionHtml ?? "",
  }));
}
