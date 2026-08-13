// Jobspresso adapter — WordPress-based blog listing, no API. Each job is an
// <article>; company + location are jammed into a WP "author" byline
// ("Company<br>⚲ Location"), and the date has no year ("August 9") so it's
// inferred against today, rolling back a year if that would land in the future.

import * as cheerio from "cheerio";
import type { Job } from "../types/job.js";

function inferPostedAt(monthDay: string): string {
  const now = new Date();
  const parsed = new Date(`${monthDay} ${now.getFullYear()}`);
  if (Number.isNaN(parsed.getTime())) return now.toISOString();

  const oneDayMs = 24 * 60 * 60 * 1000;
  if (parsed.getTime() > now.getTime() + oneDayMs) {
    parsed.setFullYear(parsed.getFullYear() - 1);
  }
  return parsed.toISOString();
}

export async function fetchJobspressoJobs(searchTerm: string): Promise<Job[]> {
  const url = `https://jobspresso.co/?s=${encodeURIComponent(searchTerm)}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });

  if (!res.ok) {
    throw new Error(`jobspresso: HTTP ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const jobs: Job[] = [];

  $("article").each((_, el) => {
    const $el = $(el);
    const href = $el.find(".entry-title a").attr("href");
    const title = $el.find(".entry-title a").text().trim();
    if (!href || !title) return;

    const authorHtml = $el.find(".author-link").html() ?? "";
    const [companyRaw, locationRaw] = authorHtml.split("<br>");
    const company = cheerio.load(companyRaw ?? "").text().trim() || "Unknown";
    const location = cheerio
      .load(locationRaw ?? "")
      .text()
      .replace(/^⚲\s*/, "")
      .trim();

    const dateText = $el.find("data.entry-date").attr("value") ?? "";
    const slugMatch = href.match(/\/job\/([^/]+)\/?$/);

    jobs.push({
      id: `jobspresso:${slugMatch?.[1] ?? href}`,
      atsProvider: "jobspresso" as const,
      company,
      title,
      location,
      url: href,
      postedAt: dateText ? inferPostedAt(dateText) : new Date().toISOString(),
      description: $el.find(".entry-summary p").first().text().trim(),
    });
  });

  return jobs;
}
