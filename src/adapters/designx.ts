// DesignX Community adapter — no API, and the listing page carries no date.
// postedAt is left empty rather than stamped with fetch time: stamping it
// would re-date every posting on every run, so nothing here would ever age
// out of the recency window. ingest.ts backfills it with the date we first
// saw the job.
//
// Explicitly allows AI crawlers (GPTBot, ClaudeBot) in robots.txt.

import * as cheerio from "cheerio";
import type { Job } from "../types/job.js";

export async function fetchDesignXJobs(): Promise<Job[]> {
  const res = await fetch("https://designx.community/jobs", { headers: { "User-Agent": "Mozilla/5.0" } });

  if (!res.ok) {
    throw new Error(`designx: HTTP ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const jobs: Job[] = [];

  $('a[href^="/jobs/"]')
    .filter((_, el) => $(el).attr("href") !== "/jobs/post-a-job")
    .each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href");
      const title = $el.find("h3").text().trim();
      const company = $el.find(".lr__feat-co").text().trim();
      const location = $el.find(".lr__feat-meta span").first().text().trim();
      const description = $el.find(".lr__feat-preview").text().trim();

      if (!href || !title) return;

      jobs.push({
        id: `designx:${href}`,
        atsProvider: "designx" as const,
        company: company || "Unknown",
        title,
        location,
        url: new URL(href, "https://designx.community").toString(),
        postedAt: "", // backfilled from first-seen in ingest.ts
        description,
      });
    });

  return jobs;
}
