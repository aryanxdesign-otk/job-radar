export type AtsProvider =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workable"
  | "recruitee"
  | "personio"
  | "teamtailor"
  | "smartrecruiters"
  | "remoteok"
  | "weworkremotely"
  | "remotive"
  | "workingnomads"
  | "remotejobsplace"
  | "jobspresso"
  | "web3career"
  | "remote3"
  | "designx";

export type RoleFamily = "senior-pd" | "lead-pd" | "uiux" | "product-owner";

export interface Job {
  id: string;
  atsProvider: AtsProvider;
  company: string;
  title: string;
  location: string;
  url: string;
  postedAt: string;
  description: string;
  roleFamily: RoleFamily;
}

export interface JobsFile {
  generatedAt: string;
  filteredAt?: string;
  funnel: Record<string, number>;
  jobs: Job[];
}
