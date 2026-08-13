// Greenhouse board API adapter.
// Docs: https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true

import type { Job } from "../types/job.js";

interface GreenhouseLocation {
  name: string;
}

interface GreenhouseJob {
  id: number;
  title: string;
  location: GreenhouseLocation;
  absolute_url: string;
  first_published: string;
  company_name: string;
  content: string;
}

interface GreenhouseBoardResponse {
  jobs: GreenhouseJob[];
}

function normalizeGreenhouseJob(job: GreenhouseJob, boardToken: string): Job {
  return {
    id: `greenhouse:${boardToken}:${job.id}`,
    atsProvider: "greenhouse",
    company: job.company_name || boardToken,
    title: job.title,
    location: job.location?.name ?? "",
    url: job.absolute_url,
    postedAt: job.first_published,
    description: job.content ?? "",
  };
}

export async function fetchGreenhouseJobs(boardToken: string): Promise<Job[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`greenhouse:${boardToken}: HTTP ${res.status}`);
  }

  const data = (await res.json()) as GreenhouseBoardResponse;
  return data.jobs.map((job) => normalizeGreenhouseJob(job, boardToken));
}
