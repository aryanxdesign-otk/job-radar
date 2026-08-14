// Given a company display name, probes it against all 8 per-company ATS
// types using guessable slug variants (lowercase, hyphenated, no-space, per
// SPEC.md Phase 2 path 2). Used by both CSV-seed resolution and future
// corpus-based probing.

import type { CompanyAtsProvider } from "../types/company.js";
import { sleep } from "./util.js";

export interface ResolveMatch {
  atsProvider: CompanyAtsProvider;
  atsSlug: string;
}

function slugVariants(name: string): string[] {
  const cleaned = name.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, "");
  const noSpace = cleaned.replace(/[\s-]+/g, "");
  const hyphenated = cleaned.replace(/\s+/g, "-");
  return Array.from(new Set([noSpace, hyphenated].filter(Boolean)));
}

// A 200 alone isn't proof of a usable board — several ATSs serve an empty
// shell for slugs that were never provisioned (or have since been emptied).
// Requiring at least one live posting keeps dead entries out of the registry.
async function hasJobs(url: string, count: (body: string) => number): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return false;
    return count(await res.text()) > 0;
  } catch {
    return false;
  }
}

function countJsonArray(body: string): number {
  const data = JSON.parse(body) as unknown;
  return Array.isArray(data) ? data.length : 0;
}

function countJsonField(field: string) {
  return (body: string): number => {
    const data = JSON.parse(body) as Record<string, unknown>;
    const value = data[field];
    return Array.isArray(value) ? value.length : typeof value === "number" ? value : 0;
  };
}

function countMatches(pattern: RegExp) {
  return (body: string): number => body.match(pattern)?.length ?? 0;
}

type Checker = (slug: string) => Promise<boolean>;

const CHECKERS: [CompanyAtsProvider, Checker][] = [
  [
    "greenhouse",
    (slug) => hasJobs(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`, countJsonField("jobs")),
  ],
  ["lever", (slug) => hasJobs(`https://api.lever.co/v0/postings/${slug}?mode=json`, countJsonArray)],
  [
    "ashby",
    (slug) => hasJobs(`https://api.ashbyhq.com/posting-api/job-board/${slug}`, countJsonField("jobs")),
  ],
  [
    "workable",
    (slug) => hasJobs(`https://www.workable.com/api/accounts/${slug}?details=true`, countJsonField("jobs")),
  ],
  ["recruitee", (slug) => hasJobs(`https://${slug}.recruitee.com/api/offers/`, countJsonField("offers"))],
  [
    "personio",
    (slug) => hasJobs(`https://${slug}.jobs.personio.de/xml?language=en`, countMatches(/<position>/g)),
  ],
  ["teamtailor", (slug) => hasJobs(`https://${slug}.teamtailor.com/jobs.rss`, countMatches(/<item>/g))],
  [
    "smartrecruiters",
    (slug) =>
      hasJobs(`https://api.smartrecruiters.com/v1/companies/${slug}/postings`, countJsonField("totalFound")),
  ],
];

/** Probes one company name against every ATS type. Politeness: 1 req/sec. */
export async function resolveCompany(name: string): Promise<ResolveMatch[]> {
  const matches: ResolveMatch[] = [];
  const seen = new Set<string>();

  for (const slug of slugVariants(name)) {
    for (const [atsProvider, checker] of CHECKERS) {
      const key = `${atsProvider}:${slug}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (await checker(slug)) {
        matches.push({ atsProvider, atsSlug: slug });
      }
      await sleep(1000);
    }
  }

  return matches;
}
