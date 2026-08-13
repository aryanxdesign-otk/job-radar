// web3.career adapter — table-based job board, no API. Each row is
// `tr.table_row`; the main cell carries `data-jobid` plus nested title/company/
// location elements. Posted time is relative ("1d", "3h") and converted to an
// absolute timestamp.

import * as cheerio from "cheerio";
import type { Job } from "../types/job.js";
import { parseRelativeTime } from "../lib/util.js";

export async function fetchWeb3CareerJobs(category: string): Promise<Job[]> {
  const url = `https://web3.career/${category}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });

  if (!res.ok) {
    throw new Error(`web3career:${category}: HTTP ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const jobs: Job[] = [];

  $("tr.table_row").each((_, el) => {
    const $row = $(el);
    const $mainCell = $row.find("td.cell-main");
    const jobId = $mainCell.attr("data-jobid");
    const href = $mainCell.find("a[href]").first().attr("href");
    const title = $mainCell.find("h2").first().text().trim();
    const company = $mainCell.find("h3").first().text().trim();
    const location = $mainCell.find(".job-location-mobile").text().replace(/📍/g, "").trim();
    const postedText = $row.find("td").eq(1).text().trim();

    if (!jobId || !href || !title) return;

    jobs.push({
      id: `web3career:${jobId}`,
      atsProvider: "web3career" as const,
      company: company || "Unknown",
      title,
      location,
      url: new URL(href, "https://web3.career").toString(),
      postedAt: parseRelativeTime(postedText),
      description: "",
    });
  });

  return jobs;
}
