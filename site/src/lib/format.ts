export function postedAge(postedAt: string): string {
  const posted = new Date(postedAt).getTime();
  if (Number.isNaN(posted)) return "";

  const days = Math.floor((Date.now() - posted) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const SOURCE_LABELS: Record<string, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  workable: "Workable",
  recruitee: "Recruitee",
  personio: "Personio",
  teamtailor: "Teamtailor",
  smartrecruiters: "SmartRecruiters",
  remoteok: "RemoteOK",
  weworkremotely: "We Work Remotely",
  remotive: "Remotive",
  workingnomads: "Working Nomads",
  remotejobsplace: "RemoteJobs.place",
  jobspresso: "Jobspresso",
  web3career: "web3.career",
  remote3: "Remote3",
  designx: "DesignX",
  a16z: "a16z",
  getro: "VC board",
};

export function sourceLabel(atsProvider: string): string {
  return SOURCE_LABELS[atsProvider] ?? atsProvider;
}

const ROLE_FAMILY_LABELS: Record<string, string> = {
  "senior-pd": "Senior PD",
  "lead-pd": "Lead PD",
  uiux: "UI/UX",
  "product-owner": "Product Owner",
};

export function roleFamilyLabel(roleFamily: string): string {
  return ROLE_FAMILY_LABELS[roleFamily] ?? roleFamily;
}
