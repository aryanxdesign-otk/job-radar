// Teamtailor RSS feed adapter — the JSON API is not public.
// Docs: https://{company}.teamtailor.com/jobs.rss
// Regional hosts (e.g. .na.teamtailor.com) and custom domains exist but aren't handled here yet.

import { XMLParser } from "fast-xml-parser";
import type { Job } from "../types/job.js";
import { titleCase } from "../lib/util.js";

interface TeamtailorLocation {
  "tt:name"?: string;
  "tt:city"?: string;
  "tt:country"?: string;
}

interface TeamtailorItem {
  title: string;
  description?: string;
  link: string;
  guid: string;
  pubDate: string;
  "tt:locations"?: {
    "tt:location"?: TeamtailorLocation | TeamtailorLocation[];
  };
}

interface TeamtailorFeed {
  rss?: {
    channel?: {
      item?: TeamtailorItem | TeamtailorItem[];
    };
  };
}

const parser = new XMLParser({ ignoreAttributes: true });

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function firstLocationName(item: TeamtailorItem): string {
  const locations = asArray(item["tt:locations"]?.["tt:location"]);
  const first = locations[0];
  return first?.["tt:name"] ?? [first?.["tt:city"], first?.["tt:country"]].filter(Boolean).join(", ");
}

export async function fetchTeamtailorJobs(company: string): Promise<Job[]> {
  const url = `https://${company}.teamtailor.com/jobs.rss`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`teamtailor:${company}: HTTP ${res.status}`);
  }

  const xml = await res.text();
  const parsed = parser.parse(xml) as TeamtailorFeed;
  const items = asArray(parsed.rss?.channel?.item);

  return items.map((item) => ({
    id: `teamtailor:${company}:${item.guid}`,
    atsProvider: "teamtailor" as const,
    company: titleCase(company),
    title: item.title,
    location: firstLocationName(item),
    url: item.link,
    postedAt: new Date(item.pubDate).toISOString(),
    description: item.description ?? "",
  }));
}
