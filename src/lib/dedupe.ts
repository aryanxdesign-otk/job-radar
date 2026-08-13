import type { Job } from "../types/job.js";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function dedupeJobs(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  const result: Job[] = [];

  for (const job of jobs) {
    const key = `${normalize(job.company)}::${normalize(job.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(job);
  }

  return result;
}
