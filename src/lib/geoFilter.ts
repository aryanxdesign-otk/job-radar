// Stage 1 geography hard-reject (SPEC.md Phase 3 + "Work authorization").
// Rule-based only; hireability and timezone grading proper belong to Stage 2.
//
// Two passes:
//
//  1. Phrases anywhere in the posting that rule it out outright ("US-only",
//     "4+ hours of PST overlap", LATAM, New Zealand).
//
//  2. The location field on its own. A posting whose location names only
//     out-of-band places is rejected even when it never says "only" — a role
//     listed as "San Francisco, CA" or "Remote - USA" is out of band whether
//     or not it spells that out. This is deliberately scoped to the location
//     field: descriptions mention cities constantly ("our New York office")
//     and running this over prose would throw away good remote listings.

const REJECT_PHRASES: RegExp[] = [
  /\bUS[\s-]?only\b|\bUnited States only\b|\bmust be (based|located|residing) in the (US|United States)\b/i,
  /\bAmericas\b(?!\s*and)/i,
  /\bLATAM\b|\bLatin America\b/i,
  /\bCanada only\b|\bmust (be|reside) in Canada\b/i,
  /\bPST\b.{0,20}\boverlap\b|\bEST\b.{0,20}\boverlap\b|\b4\+?\s*hours?\s*(of\s*)?(PST|EST)\b/i,
  /\bNew Zealand\b/i,
  // Australia east coast, unless Perth/WA is offered alongside.
  /\b(Sydney|Melbourne|Brisbane|Canberra)\b(?!.{0,40}(Perth|Western Australia|WA\b))/i,
];

// Out-of-band markers that show up in location fields.
const OUT_OF_BAND_LOCATION = new RegExp(
  [
    "\\bUSA?\\b",
    "\\bU\\.S\\.A?\\.?",
    "\\bUnited States\\b",
    "\\bNorth America\\b|\\bSouth America\\b",
    "\\bCanada\\b",
    "\\bMexico\\b|\\bBrazil\\b|\\bArgentina\\b|\\bColombia\\b|\\bCOL\\b|\\bChile\\b|\\bPeru\\b",
    "\\bBogot[aá]\\b|\\bLima\\b|\\bSantiago\\b|\\bBuenos Aires\\b|\\bS[aã]o Paulo\\b|\\bMedell[ií]n\\b",
    "\\b(California|Texas|Washington|Massachusetts|Illinois|Colorado|Georgia|Florida|Oregon|Virginia|Arizona|Utah|Michigan|Minnesota|Ontario|Toronto|Vancouver|Montreal)\\b",
    "\\b(San Francisco|New York|NYC|Los Angeles|Seattle|Austin|Boston|Chicago|Denver|Atlanta|Miami|Portland|San Diego|San Jose|Palo Alto|Mountain View|Sunnyvale|Menlo Park|Bellevue|Brooklyn)\\b",
    "\\b(CA|NY|TX|WA|MA|IL|CO|GA|FL|OR|VA|AZ|UT|MI|MN|NC|NJ|PA|DC)\\b",
  ].join("|"),
  "i",
);

// In-band markers. Their presence means the posting offers at least one
// location we can work from, so a US city listed beside them is a choice
// rather than a requirement.
const IN_BAND_LOCATION = new RegExp(
  [
    "\\bglobal(ly)?\\b|\\bworldwide\\b|\\banywhere\\b|\\bany location\\b",
    "\\bEMEA\\b|\\bAPAC\\b|\\bEurope(an)?\\b|\\bEU\\b|\\bE\\.U\\.",
    "\\bUK\\b|\\bUnited Kingdom\\b|\\bEngland\\b|\\bLondon\\b|\\bScotland\\b|\\bIreland\\b|\\bDublin\\b",
    "\\bGermany\\b|\\bBerlin\\b|\\bMunich\\b|\\bDACH\\b|\\bAustria\\b|\\bSwitzerland\\b|\\bZurich\\b",
    "\\bNetherlands\\b|\\bAmsterdam\\b|\\bBelgium\\b|\\bBenelux\\b|\\bFrance\\b|\\bParis\\b",
    "\\bSpain\\b|\\bMadrid\\b|\\bBarcelona\\b|\\bPortugal\\b|\\bLisbon\\b|\\bItaly\\b|\\bMilan\\b",
    "\\bPoland\\b|\\bWarsaw\\b|\\bKrakow\\b|\\bBaltics\\b|\\bEstonia\\b|\\bLatvia\\b|\\bLithuania\\b",
    "\\bNordics?\\b|\\bSweden\\b|\\bStockholm\\b|\\bDenmark\\b|\\bCopenhagen\\b|\\bNorway\\b|\\bOslo\\b|\\bFinland\\b|\\bHelsinki\\b",
    "\\bIndia\\b|\\bBengaluru\\b|\\bBangalore\\b|\\bMumbai\\b|\\bDelhi\\b|\\bHyderabad\\b|\\bPune\\b|\\bChennai\\b",
    "\\bSingapore\\b|\\bJapan\\b|\\bTokyo\\b|\\bKorea\\b|\\bSeoul\\b|\\bIndonesia\\b|\\bVietnam\\b|\\bThailand\\b|\\bMalaysia\\b|\\bPhilippines\\b",
    "\\bIsrael\\b|\\bTel[-\\s]?Aviv\\b|\\bUAE\\b|\\bDubai\\b|\\bMiddle East\\b|\\bTurkey\\b|\\bIstanbul\\b",
    "\\bAfrica\\b|\\bNigeria\\b|\\bLagos\\b|\\bKenya\\b|\\bNairobi\\b|\\bEgypt\\b|\\bSouth Africa\\b|\\bCape Town\\b",
    "\\bPerth\\b|\\bWestern Australia\\b",
  ].join("|"),
  "i",
);

export function isGeoRejected(location: string, description: string): boolean {
  if (REJECT_PHRASES.some((pattern) => pattern.test(`${location} ${description}`))) {
    return true;
  }

  // An empty or purely "remote" location says nothing against us — let it
  // through for Stage 2 rather than guessing.
  if (!location.trim()) return false;

  return OUT_OF_BAND_LOCATION.test(location) && !IN_BAND_LOCATION.test(location);
}
