// Personio XML feed adapter.
// Docs: https://{company}.jobs.personio.de/xml?language=en
// Some accounts serve the same feed under .com instead of .de.

import { XMLParser } from "fast-xml-parser";
import type { Job } from "../types/job.js";
import { titleCase } from "../lib/util.js";

interface PersonioJobDescription {
  name: string;
  value: string | { __cdata: string };
}

interface PersonioPosition {
  id: number;
  name: string;
  office?: string;
  createdAt: string;
  jobDescriptions?: {
    jobDescription: PersonioJobDescription | PersonioJobDescription[];
  };
}

interface PersonioFeed {
  "workzag-jobs"?: {
    position?: PersonioPosition | PersonioPosition[];
  };
}

const parser = new XMLParser({ ignoreAttributes: true, cdataPropName: "__cdata" });

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function descriptionText(value: PersonioJobDescription["value"]): string {
  return typeof value === "string" ? value : value.__cdata;
}

function flattenDescription(position: PersonioPosition): string {
  const sections = asArray(position.jobDescriptions?.jobDescription);
  return sections.map((s) => `${s.name}\n${descriptionText(s.value)}`).join("\n\n");
}

async function fetchPersonioFeed(company: string, tld: "de" | "com"): Promise<PersonioPosition[]> {
  const url = `https://${company}.jobs.personio.${tld}/xml?language=en`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`personio:${company}: HTTP ${res.status}`);
  }

  const xml = await res.text();
  const parsed = parser.parse(xml) as PersonioFeed;
  return asArray(parsed["workzag-jobs"]?.position);
}

export async function fetchPersonioJobs(company: string, tld: "de" | "com" = "de"): Promise<Job[]> {
  const positions = await fetchPersonioFeed(company, tld);

  return positions.map((position) => ({
    id: `personio:${company}:${position.id}`,
    atsProvider: "personio" as const,
    company: titleCase(company),
    title: position.name,
    location: position.office ?? "",
    url: `https://${company}.jobs.personio.${tld}/job/${position.id}`,
    postedAt: position.createdAt,
    description: flattenDescription(position),
  }));
}
