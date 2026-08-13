// Lever postings API adapter.
// Docs: https://api.lever.co/v0/postings/{site}?mode=json

import type { Job } from "../types/job.js";
import { titleCase } from "../lib/util.js";

interface LeverCategories {
  location?: string;
}

interface LeverJob {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt: number; // epoch ms
  categories: LeverCategories;
  descriptionPlain?: string;
  description?: string;
}

export async function fetchLeverJobs(siteToken: string): Promise<Job[]> {
  const url = `https://api.lever.co/v0/postings/${siteToken}?mode=json`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`lever:${siteToken}: HTTP ${res.status}`);
  }

  const jobs = (await res.json()) as LeverJob[];

  return jobs.map((job) => ({
    id: `lever:${siteToken}:${job.id}`,
    atsProvider: "lever" as const,
    company: titleCase(siteToken),
    title: job.text,
    location: job.categories?.location ?? "",
    url: job.hostedUrl,
    postedAt: new Date(job.createdAt).toISOString(),
    description: job.descriptionPlain ?? job.description ?? "",
  }));
}
