// a16z portfolio job board (jobs.a16z.com), which runs on Consider.
//
// The board is client-rendered, but its own XHR endpoint takes a title query,
// so we ask for design titles directly instead of pulling the whole board and
// discarding 98% of it. robots.txt allows all crawlers here (only LinkedInBot
// is disallowed).
//
// The endpoint is CSRF-protected in the ordinary way: the page issues a token
// and a session cookie, and the request carries both back. That is the same
// handshake a browser performs — no bot check is being worked around.

import type { Job } from "../types/job.js";
import { sleep } from "./../lib/util.js";

const BOARD_ID = "andreessen-horowitz";
const PAGE_URL = "https://jobs.a16z.com/jobs";
const SEARCH_URL = "https://jobs.a16z.com/api-boards/search-jobs";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Title queries covering the four role families. The endpoint matches tokens
// rather than a strict prefix, so "design" also returns "Senior Product
// Designer" and "Design Lead".
const TITLE_QUERIES = ["design", "product owner", "ux", "ui"];
const PAGE_SIZE = 100;

interface A16zJob {
  jobId: string;
  title: string;
  companyName: string;
  companySlug?: string;
  locations?: string[];
  url?: string;
  applyUrl?: string;
  timeStamp?: string;
  remote?: boolean;
}

interface Session {
  csrfToken: string;
  cookie: string;
}

async function openSession(): Promise<Session> {
  const res = await fetch(PAGE_URL, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`a16z: session page HTTP ${res.status}`);

  const cookie = res.headers
    .getSetCookie()
    .map((entry) => entry.split(";")[0])
    .join("; ");

  const html = await res.text();
  const token = html.match(/"csrfToken":"([^"]+)"/)?.[1];
  if (!token) throw new Error("a16z: no csrfToken on the page (markup may have changed)");

  return { csrfToken: token, cookie };
}

async function search(session: Session, titlePrefix: string): Promise<A16zJob[]> {
  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      Origin: "https://jobs.a16z.com",
      Referer: PAGE_URL,
      "x-csrf-token": session.csrfToken,
      Cookie: session.cookie,
    },
    body: JSON.stringify({
      meta: { size: PAGE_SIZE },
      board: { id: BOARD_ID, isParent: true },
      query: { titlePrefix, promoteFeatured: true },
    }),
  });

  if (!res.ok) throw new Error(`a16z:${titlePrefix}: HTTP ${res.status}`);
  const data = (await res.json()) as { jobs?: A16zJob[] };
  return data.jobs ?? [];
}

export async function fetchA16zJobs(): Promise<Job[]> {
  const session = await openSession();
  const seen = new Map<string, A16zJob>();

  for (const query of TITLE_QUERIES) {
    // One bad query shouldn't lose the rest of the board.
    try {
      for (const job of await search(session, query)) {
        if (job.jobId) seen.set(job.jobId, job);
      }
    } catch (err) {
      console.error(`  a16z query "${query}" failed: ${(err as Error).message}`);
    }
    await sleep(1000);
  }

  return Array.from(seen.values()).map((job) => ({
    id: `a16z:${job.jobId}`,
    atsProvider: "a16z" as const,
    company: job.companyName,
    title: job.title,
    location: (job.locations ?? []).join(", ") || (job.remote ? "Remote" : ""),
    url: job.url || job.applyUrl || PAGE_URL,
    postedAt: job.timeStamp ? new Date(job.timeStamp).toISOString() : "",
    description: "",
  }));
}
