// Working Nomads adapter — undocumented but public JSON API found via the site's
// own nav link (not in any published docs). The `category` query param doesn't
// actually filter server-side (always returns the same latest-50 feed regardless
// of value) — same "fetch broadly, filter downstream" pattern as RemoteOK.

import type { Job } from "../types/job.js";

interface WorkingNomadsJob {
  url: string;
  title: string;
  description?: string;
  company_name: string;
  location?: string;
  pub_date: string;
}

function idFromUrl(url: string): string {
  const match = url.match(/\/job\/go\/(\d+)/);
  return match?.[1] ?? url;
}

export async function fetchWorkingNomadsJobs(): Promise<Job[]> {
  const res = await fetch("https://www.workingnomads.com/api/exposed_jobs/", {
    headers: { "User-Agent": "job-radar (personal use; contact: aryanchillal@gmail.com)" },
  });

  if (!res.ok) {
    throw new Error(`workingnomads: HTTP ${res.status}`);
  }

  const jobs = (await res.json()) as WorkingNomadsJob[];

  return jobs.map((job) => ({
    id: `workingnomads:${idFromUrl(job.url)}`,
    atsProvider: "workingnomads" as const,
    company: job.company_name,
    title: job.title,
    location: job.location ?? "",
    url: job.url,
    postedAt: job.pub_date,
    description: job.description ?? "",
  }));
}
