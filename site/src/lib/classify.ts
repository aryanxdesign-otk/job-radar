// Lightweight client-side seniority heuristic for the UI badge. Role family
// itself now comes from the real Stage 1 filter (src/filter.ts) baked into
// jobs.json — no longer inferred client-side.

export type SeniorityLevel = "Intern" | "Junior" | "Mid" | "Senior" | "Staff" | "Principal" | "Lead" | "Director+";

const SENIORITY_PATTERNS: [SeniorityLevel, RegExp][] = [
  ["Intern", /\bintern(ship)?\b/i],
  ["Director+", /\bdirector\b|\bhead of\b|\bvp\b|\bvice president\b|\bchief\b/i],
  ["Principal", /\bprincipal\b/i],
  ["Staff", /\bstaff\b/i],
  ["Lead", /\blead\b/i],
  ["Junior", /\bjunior\b|\bjr\.?\b|entry[\s-]?level/i],
  ["Senior", /\bsenior\b|\bsr\.?\b/i],
  ["Mid", /\bmid[\s-]?level\b|\bmid\b/i],
];

export function inferSeniority(title: string): SeniorityLevel | null {
  for (const [level, pattern] of SENIORITY_PATTERNS) {
    if (pattern.test(title)) return level;
  }
  return null;
}
