// Workable accounts API adapter.
// Docs: https://www.workable.com/api/accounts/{subdomain}?details=true
// This 302-redirects to apply.workable.com; fetch follows it automatically.

import type { Job } from "../types/job.js";
import { titleCase } from "../lib/util.js";

interface WorkableJob {
  title: string;
  shortcode: string;
  url: string;
  city?: string;
  country?: string;
  published_on?: string;
  created_at: string;
  description?: string;
}

interface WorkableAccountResponse {
  name?: string;
  jobs: WorkableJob[];
}

export async function fetchWorkableJobs(subdomain: string): Promise<Job[]> {
  const url = `https://www.workable.com/api/accounts/${subdomain}?details=true`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`workable:${subdomain}: HTTP ${res.status}`);
  }

  const data = (await res.json()) as WorkableAccountResponse;

  return data.jobs.map((job) => ({
    id: `workable:${subdomain}:${job.shortcode}`,
    atsProvider: "workable" as const,
    company: data.name || titleCase(subdomain),
    title: job.title,
    location: [job.city, job.country].filter(Boolean).join(", "),
    url: job.url,
    postedAt: job.published_on ?? job.created_at,
    description: job.description ?? "",
  }));
}
