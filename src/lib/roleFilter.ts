// Stage 1 role-family + seniority classifier (SPEC.md Phase 3).
// Rule-based only — no LLM yet, that's Stage 2 (score.ts). Per SPEC.md:
// "Match generously on title, let scoring sort it out" — so this stays
// inclusive on family matching and only hard-rejects on explicit signals
// (junior/intern, or disciplines outside product/UX design).

export type RoleFamily = "senior-pd" | "lead-pd" | "uiux" | "product-owner";

const EXCLUDE_PATTERNS: RegExp[] = [
  /\bjunior\b|\bjr\.?\b|\bintern(ship)?\b|entry[\s-]?level/i,
  /\bgraphic\s*design(er)?\b/i,
  /\bmotion\s*design(er)?\b/i,
  /\binstructional\s*design(er)?\b/i,
  /\bmarketing\s*design(er)?\b/i,
  /\bbrand\s*design(er)?\b/i,
  // Standalone design researcher — not excluded when paired with a design/PM title.
  /^\s*(design\s*)?(ux\s*)?researcher\s*$/i,
];

const FAMILY_PATTERNS: [RoleFamily, RegExp][] = [
  [
    "lead-pd",
    /\blead\s*product\s*designer\b|\bprincipal\s*product\s*designer\b|\bstaff\s*product\s*designer\b|\bdesign\s*lead\b|\bhead\s*of\s*design\b/i,
  ],
  [
    "senior-pd",
    /\bsenior\s*product\s*designer\b|\bsr\.?\s*product\s*designer\b|\bproduct\s*designer\s*(ii|iii|2|3)\b|\bsenior\s*designer\s*\(?product\)?/i,
  ],
  ["product-owner", /\bproduct\s*owner\b/i],
  [
    "uiux",
    /\bui\s*\/?\s*ux\s*designer\b|\bux\s*\/?\s*ui\s*designer\b|\bux\s*designer\b|\bui\s*designer\b|\bproduct\s*designer\b|\bproduct\s*design\b/i,
  ],
];

export function classifyRole(title: string): RoleFamily | null {
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(title)) return null;
  }

  for (const [family, pattern] of FAMILY_PATTERNS) {
    if (pattern.test(title)) return family;
  }

  return null;
}
