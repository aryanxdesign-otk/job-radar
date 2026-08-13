// We Work Remotely per-category RSS adapter.
// Docs: https://weworkremotely.com/categories/{category}.rss
// Public feed, same shape as the Teamtailor adapter. Titles arrive as
// "Company: Job Title" — split on the first colon.

import { XMLParser } from "fast-xml-parser";
import type { Job } from "../types/job.js";

interface WwrItem {
  title: string;
  description?: string;
  link: string;
  guid: string;
  pubDate: string;
  region?: string;
  country?: string;
  state?: string;
}

interface WwrFeed {
  rss?: {
    channel?: {
      item?: WwrItem | WwrItem[];
    };
  };
}

const parser = new XMLParser({ ignoreAttributes: true });

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function splitCompanyTitle(raw: string): { company: string; title: string } {
  const separatorIndex = raw.indexOf(": ");
  if (separatorIndex === -1) return { company: "", title: raw };
  return { company: raw.slice(0, separatorIndex), title: raw.slice(separatorIndex + 2) };
}

export async function fetchWeWorkRemotelyJobs(category: string): Promise<Job[]> {
  const url = `https://weworkremotely.com/categories/${category}.rss`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`weworkremotely:${category}: HTTP ${res.status}`);
  }

  const xml = await res.text();
  const parsed = parser.parse(xml) as WwrFeed;
  const items = asArray(parsed.rss?.channel?.item);

  return items.map((item) => {
    const { company, title } = splitCompanyTitle(item.title);
    return {
      id: `weworkremotely:${category}:${item.guid}`,
      atsProvider: "weworkremotely" as const,
      company,
      title,
      location: item.region ?? item.country ?? "",
      url: item.link,
      postedAt: new Date(item.pubDate).toISOString(),
      description: item.description ?? "",
    };
  });
}
