// Only the 8 per-company ATS types belong in the registry — aggregator
// sources (RemoteOK, Remotive, etc.) aren't tied to a single company slug.
export type CompanyAtsProvider =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workable"
  | "recruitee"
  | "personio"
  | "teamtailor"
  | "smartrecruiters";

export type CompanyStatus = "active" | "dormant" | "unsupported";

export interface CompanyRecord {
  name: string;
  atsProvider: CompanyAtsProvider;
  atsSlug: string;
  region: string;
  tags: string[];
  addedAt: string; // ISO
  lastSeenJobsAt: string | null; // ISO, null if never seen a job
  status: CompanyStatus;
}
