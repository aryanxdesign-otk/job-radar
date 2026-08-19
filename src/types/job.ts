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
  | "laborx"
  | "designx"
  | "a16z";

export interface Job {
  id: string; // `${atsProvider}:${company slug}:${source id}` — stable across runs
  atsProvider: AtsProvider;
  company: string;
  title: string;
  location: string;
  url: string;
  postedAt: string; // ISO 8601
  description: string;
}
