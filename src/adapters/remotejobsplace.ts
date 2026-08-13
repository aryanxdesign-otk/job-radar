// RemoteJobs.place adapter. No public API — job data is embedded in the
// homepage's Next.js RSC streaming payload (self.__next_f.push([1, "..."])),
// not a documented endpoint. More fragile than the other adapters: this is an
// internal Next.js wire format that can change on any framework/site update.
// Includes a visa_sponsorship field, useful for hireability grading later.

import type { Job } from "../types/job.js";

interface RemoteJobsPlaceJob {
  id: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  applyUrl: string;
  postedAt: string;
  visa_sponsorship?: boolean;
}

const PUSH_REGEX = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;

function extractInitialJobs(html: string): RemoteJobsPlaceJob[] {
  let combined = "";
  for (const match of html.matchAll(PUSH_REGEX)) {
    combined += JSON.parse(`"${match[1]}"`);
  }

  const marker = '"initialJobs":[';
  const markerIndex = combined.indexOf(marker);
  if (markerIndex === -1) return [];

  const arrStart = markerIndex + marker.length - 1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let arrEnd = -1;

  for (let i = arrStart; i < combined.length; i++) {
    const c = combined[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (c === "\\") {
      escaped = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "[") depth++;
    if (c === "]") {
      depth--;
      if (depth === 0) {
        arrEnd = i + 1;
        break;
      }
    }
  }

  if (arrEnd === -1) return [];
  return JSON.parse(combined.slice(arrStart, arrEnd)) as RemoteJobsPlaceJob[];
}

export async function fetchRemoteJobsPlaceJobs(): Promise<Job[]> {
  const res = await fetch("https://www.remotejobs.place/", {
    headers: { "User-Agent": "job-radar (personal use; contact: aryanchillal@gmail.com)" },
  });

  if (!res.ok) {
    throw new Error(`remotejobsplace: HTTP ${res.status}`);
  }

  const html = await res.text();
  const jobs = extractInitialJobs(html);

  return jobs.map((job) => ({
    id: `remotejobsplace:${job.id}`,
    atsProvider: "remotejobsplace" as const,
    company: job.company,
    title: job.title,
    location: job.location ?? "",
    url: job.applyUrl,
    postedAt: job.postedAt,
    description: job.description ?? "",
  }));
}
