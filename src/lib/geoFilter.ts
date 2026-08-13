// Stage 1 geography hard-reject (SPEC.md Phase 3 + "Work authorization" section).
// Rule-based only. Per SPEC.md: "The location field lies constantly" — so this
// scans location AND description together. Only rejects on explicit reject
// signals; anything else passes through to Stage 2 for the real hireability/
// timezone grading (in-band/edge/out-of-band, global-contractor/etc.).

const REJECT_PATTERNS: RegExp[] = [
  /\bUS[\s-]?only\b|\bUnited States only\b|\bmust be (based|located|residing) in the (US|United States)\b/i,
  /\bAmericas\b(?!\s*and)/i,
  /\bLATAM\b|\bLatin America\b/i,
  /\bCanada only\b|\bmust (be|reside) in Canada\b/i,
  /\bPST\b.{0,20}\boverlap\b|\bEST\b.{0,20}\boverlap\b|\b4\+?\s*hours?\s*(of\s*)?(PST|EST)\b/i,
  /\bNew Zealand\b/i,
  // Australia east-coast cities without a Perth/WA qualifier nearby.
  /\b(Sydney|Melbourne|Brisbane|Canberra)\b(?!.{0,40}(Perth|Western Australia|WA\b))/i,
];

export function isGeoRejected(location: string, description: string): boolean {
  const text = `${location} ${description}`;
  return REJECT_PATTERNS.some((pattern) => pattern.test(text));
}
