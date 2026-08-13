// RemoteOK public API adapter.
// Docs: https://remoteok.com/api
// Global feed of the ~100 most recent remote jobs across all categories — no
// server-side filtering by tag/category despite the query params existing in
// their docs. Role-family filtering happens downstream in Phase 3.
// ToS: attribute "Remote OK" and link back to the job's url.

import type { Job } from "../types/job.js";

interface RemoteOkJob {
  id: string;
  slug: string;
  position: string;
  company: string;
  location: string;
  description?: string;
  date: string;
  url: string;
}

export async function fetchRemoteOkJobs(): Promise<Job[]> {
  const res = await fetch("https://remoteok.com/api", {
    headers: { "User-Agent": "job-radar (personal use; contact: aryanchillal@gmail.com)" },
  });

  if (!res.ok) {
    throw new Error(`remoteok: HTTP ${res.status}`);
  }

  const data = (await res.json()) as unknown[];
  // First element is always the API's legal notice, not a job.
  const jobs = data.filter((entry): entry is RemoteOkJob => typeof (entry as RemoteOkJob).id === "string");

  return jobs.map((job) => ({
    id: `remoteok:${job.id}`,
    atsProvider: "remoteok" as const,
    company: job.company,
    title: job.position,
    location: job.location || "Remote",
    url: job.url,
    postedAt: job.date,
    description: job.description ?? "",
  }));
}
