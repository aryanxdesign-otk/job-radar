// Remote3.co adapter — Bubble.io-built site, no API. Job cards are
// `a.JobListingItem_jobListItem__xVi8n`. Some entries on the live site are
// broken placeholders (title literally "page_title") — filtered out.

import * as cheerio from "cheerio";
import type { Job } from "../types/job.js";
import { parseRelativeTime } from "../lib/util.js";

export async function fetchRemote3Jobs(category: string): Promise<Job[]> {
  const url = `https://www.remote3.co/${category}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });

  if (!res.ok) {
    throw new Error(`remote3:${category}: HTTP ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const jobs: Job[] = [];

  $("a.JobListingItem_jobListItem__xVi8n").each((_, el) => {
    const $el = $(el);
    const href = $el.attr("href");
    const title = $el.find(".JobListingItem_jobTitle__cGBFq").text().trim();
    const company = $el.find(".text-tertiary-white").first().text().trim();
    const location = $el.find(".JobListingItem_infoContainer__Dk23e").eq(1).find("p").text().trim();
    const postedText = $el.find(".JobListingItem_rightContainer__VHKWD p").text().trim();

    if (!href || !title || title === "page_title") return;

    jobs.push({
      id: `remote3:${href}`,
      atsProvider: "remote3" as const,
      company: company || "Unknown",
      title,
      location,
      url: new URL(href, "https://www.remote3.co").toString(),
      postedAt: parseRelativeTime(postedText),
      description: "",
    });
  });

  return jobs;
}
