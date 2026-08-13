// Recruitee offers API adapter.
// Docs: https://{company}.recruitee.com/api/offers/

import type { Job } from "../types/job.js";
import { titleCase } from "../lib/util.js";

interface RecruiteeOffer {
  id: number;
  title: string;
  location?: string;
  careers_url: string;
  published_at?: string;
  created_at: string;
  description?: string;
  company_name?: string;
}

interface RecruiteeResponse {
  offers: RecruiteeOffer[];
}

export async function fetchRecruiteeJobs(company: string): Promise<Job[]> {
  const url = `https://${company}.recruitee.com/api/offers/`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`recruitee:${company}: HTTP ${res.status}`);
  }

  const data = (await res.json()) as RecruiteeResponse;

  return data.offers.map((offer) => ({
    id: `recruitee:${company}:${offer.id}`,
    atsProvider: "recruitee" as const,
    company: offer.company_name || titleCase(company),
    title: offer.title,
    location: offer.location ?? "",
    url: offer.careers_url,
    postedAt: offer.published_at ?? offer.created_at,
    description: offer.description ?? "",
  }));
}
