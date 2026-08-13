const LAST_VISIT_KEY = "job-radar:last-visit";

export function getLastVisit(): number | null {
  const raw = localStorage.getItem(LAST_VISIT_KEY);
  return raw ? Number(raw) : null;
}

export function setLastVisit(): void {
  localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
}
