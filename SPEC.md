# Build Spec: Job Radar
Paste into Claude Code as the opening prompt. Keep in the repo as `SPEC.md`.

**Research status: endpoint research is DONE. Do not re-investigate. Start at step 1 of the build order.**

---

## Who this is for

Senior product designer (5+ yrs) moving toward design engineering. Background in crypto/DeFi and data-dense trading interfaces, but **this tool is sector-agnostic** — any industry. Based in India (IST, UTC+5:30), need globally remote work. Comfortable with React/Vite/TypeScript.

Personal job radar. Single user. No auth, no accounts. Optimize for signal, not coverage.

## Architecture constraints

- **Zero infra.** GitHub Actions cron → writes `data/jobs.json` → commits it → static site reads it. No database, no server, no serverless functions.
- Site: Vite + React + TypeScript, deployed to GitHub Pages, Netlify, or Vercel from the same repo.
- Client state (saved / applied / passed) in `localStorage`.
- Anthropic API calls happen **only inside the GitHub Action**, never in the browser. Key in repo secrets.
- Committed `jobs.json` gives a free daily diff. Lean on it.

## What I'm looking for

**Four role families.** Match generously on title, let scoring sort it out.

1. **Senior Product Designer** — also Sr. Product Designer, Product Designer II/III, Senior Designer (Product)
2. **Lead Product Designer** — also Principal / Staff Product Designer, Design Lead, Head of Design (small teams only)
3. **UI/UX Designer** — also UX Designer, UI Designer, Product Designer (UX). Mid-level and up only.
4. **Product Owner** — also Senior Product Owner, Technical Product Owner

Exclude: graphic, motion, instructional, marketing/brand designer; standalone design researcher; anything junior or intern.

**Timezone band: UTC+0 to UTC+9.** I sit mid-band at IST. Accept: global/worldwide/anywhere, EMEA, APAC, Europe, UK, Ireland, Portugal, Nordics, DACH, Benelux, Poland, Baltics, India, SE Asia, Singapore, Japan, Korea, Middle East, Africa, Perth/WA. Reject: US-only, US-overlap-required, Americas, LATAM, Canada, Australia east coast, New Zealand, anything needing 4+ hours of PST/EST overlap.

**Work authorization is the primary filter, not a footnote.** Most "Remote, Europe" listings quietly require local right to work, which makes them useless to me. Grade every job:

- `global-contractor` — hires contractors anywhere, or names an EOR (Deel, Remote.com, Oyster, Velocity Global)
- `global-employee` — entities or EOR across regions, explicitly hires worldwide
- `region-open` — open across a region with no named country requirement
- `entity-restricted` — requires right to work in a specific country → **hard reject**
- `unclear` — surface it, rank below anything explicit

Read the description text for these signals. The location field lies constantly.

## Phase 1 — Ingestion (ATS only, endpoints verified)

No aggregators. No LinkedIn, Indeed, or Wellfound — they block and it violates their ToS. If I ask later, refuse.

**Update (see Phase 1B below):** the no-aggregators rule stays in force for LinkedIn, Indeed, and Wellfound specifically. A separate, deliberately scoped set of remote-work and vertical (crypto/web3) job boards was evaluated site-by-site — robots.txt, ToS, structured-data availability — and added as a second source class. Wellfound stays refused.

One typed adapter per ATS, all normalizing to a shared `Job` type. All endpoints below are public and require no auth.

| ATS | Endpoint | Format | Notes |
|---|---|---|---|
| Greenhouse | `https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true` | JSON | Cleanest fields. Start here. |
| Lever | `https://api.lever.co/v0/postings/{site}?mode=json` | JSON | Supports server-side `team`, `location`, `commitment`, `level`, `skip`, `limit` |
| Ashby | `https://api.ashbyhq.com/posting-api/job-board/{name}?includeCompensation=true` | JSON | Best compensation data |
| Workable | `https://www.workable.com/api/accounts/{subdomain}?details=true` | JSON | Companion `/locations` and `/departments` endpoints exist |
| Recruitee | `https://{company}.recruitee.com/api/offers/` | JSON | Lighter metadata; NL/EU-heavy |
| Personio | `https://{company}.jobs.personio.de/xml?language=en` | XML | Some accounts use `.com` — check the live hostname |
| Teamtailor | `https://{company}.teamtailor.com/jobs.rss` | RSS | **JSON API is not public — RSS only.** Full descriptions included |
| SmartRecruiters | `https://api.smartrecruiters.com/v1/companies/{id}/postings?q=&country=&limit=&offset=` | JSON | Supports `q` and `country` server-side |

**Known gotchas, handle these explicitly:**

- Teamtailor: regional hosts (`.na.teamtailor.com`) and custom domains that redirect. Rate-limit to ~60 req/min; responses appear to cache ~5 min. HTML entities in RSS need unescaping. Department and commitment are frequently null.
- Personio: XML, not JSON. Namespaced.
- SmartRecruiters: tier-dependent — not every customer has the Postings API enabled. A 404 is not a bug; mark the company `unsupported` and move on.
- Recruitee and Workable: sparse structured fields. The normalizer must tolerate nulls everywhere and fall back to description text.

Geographic skew matters for my band: Greenhouse, Lever, Ashby and SmartRecruiters lean US; Personio (DACH), Teamtailor (Nordics), Recruitee (Benelux) and Workable (broad EU/SMB) are where in-band roles actually live. Weight registry-building effort accordingly.

Politeness: 1 req/sec default, exponential backoff, and never let one failing source kill the run. Log failures, continue.

## Phase 1B — Aggregator & vertical board ingestion

Evaluated ~28 candidate sites against robots.txt, ToS text, and whether they expose structured data (JSON API / RSS) vs. requiring bespoke HTML scraping. Wellfound refused outright per the standing instruction above; FlexJobs, Instahyre, and Weekday skipped as not worth the effort (paywalled, connection-blocked, or thin public content behind recruiter-matching flows). Everything else sorted into two tiers:

**Tier 1 — structured, low risk:**

| Source | Access | Notes |
|---|---|---|
| RemoteOK | `https://remoteok.com/api` (JSON) | Fully structured: title, company, location, HTML description, apply URL. ToS: backlink + "Remote OK" attribution. |
| We Work Remotely | `https://weworkremotely.com/categories/remote-design-jobs.rss` (RSS) | Same shape as the Teamtailor adapter. Public, designed for consumption. |
| Remotive | `https://remotive.com/api/remote-jobs?search=...` (JSON) | Structured, but ToS caps requests (~4/day), requires backlink attribution, and asks not to re-syndicate to third-party job boards (Jooble/Google Jobs/LinkedIn Jobs named as the target) — treated as compatible with a personal, low-frequency, attributed single-user tool, not a competing aggregator. |

**Tier 2 — feasible, bespoke HTML scraping (no API/feed found, permissive robots.txt):** designx.community, remotejobs.place, farcoder.com, remoterocketship.com, jobspresso.co, workingnomads.com, nodesk.co, himalayas.app (has job sitemaps), ethstars.xyz, cryptojobslist.com, web3.career, remote3.co, cryptocurrencyjobs.co, cryptojobs.com, laborx.com. Each needs its own scraper against site-specific HTML; each can break silently on a redesign. No shared schema — normalize into the same `Job` type as the ATS adapters.

Politeness and attribution rules from Phase 1 apply here too, plus: respect each site's stated rate-limit guidance where given (e.g. Remotive's ~4 req/day), and surface a visible source-attribution link per job on the site (Phase 5) for sources whose ToS asks for it.

## Phase 2 — The registry (this is the hard part)

**Confirmed: no ATS offers cross-company search.** Every endpoint above is per-company. There is no shortcut. Registry growth is the entire moat, so build for it deliberately.

`data/companies.json`: `{ name, atsProvider, atsSlug, region, tags[], addedAt, lastSeenJobsAt, status }`.

Three bootstrap paths, build all three:

1. **Public slug lists.** Search GitHub for maintained lists of Greenhouse board tokens and Lever site names — the scraper community keeps several. Import, dedupe, validate each with one live request.
2. **Slug probing.** The subdomain-pattern ATSs (Recruitee, Teamtailor, Personio, Workable) have highly guessable slugs. Take open company-name corpora (YC's public directory is a good start; European startup lists too) and probe each name — lowercase, hyphenated, no-space variants — against every ATS. Valid response → written into the registry permanently. Prioritize European corpora over US ones.
3. **Manual seeds.** A CSV drop point where I paste company names and they get auto-resolved.

Companies with zero matching jobs for 180 days → `dormant`, skipped on future runs, never deleted. Companies returning 404 on a tier-gated ATS → `unsupported`.

`discover.ts` must be idempotent, resumable, and safe to run for hours.

## Phase 3 — Two-stage filtering

**Stage 1: hard filter, no LLM.** Runs before anything expensive.

- Title matches one of the four role families.
- Seniority mid or above.
- No hard-reject geography in location or description.
- Posted within 21 days.
- Dedupe on `(normalized company, normalized title)`.

Use Lever's and SmartRecruiters' server-side filters to shrink payloads before they're even downloaded.

Log funnel counts each run — raw → title-matched → geo-passed → deduped — so I can see where volume dies.

**Stage 2: LLM scoring (Claude Haiku).** Only on Stage 1 survivors **never scored before**. Cache by stable job ID in `data/scores.json`. Enforce never-rescore with an assertion, not a convention. It's the main cost control.

Strict JSON:

```
{
  "fitScore": 0-100,
  "hireability": "global-contractor" | "global-employee" | "region-open" | "entity-restricted" | "unclear",
  "timezone": "in-band" | "edge" | "out-of-band",
  "roleFamily": "senior-pd" | "lead-pd" | "uiux" | "product-owner",
  "why": "one sentence, max 20 words, specific to my background",
  "flags": ["equity-heavy" | "contract-only" | "unclear-comp" | "agile-heavy" | "solo-designer" | "large-org"]
}
```

Two rubrics, selected by `roleFamily`:

- **Design roles** — weight craft depth, 0-to-1 work, data-dense or complex interfaces, design-engineering hybrid ability, team size and design maturity.
- **Product Owner** — weight domain complexity and genuine product ownership. Penalize disguised project management and pure ceremony roles.

`entity-restricted` caps fitScore at 20 regardless of other fit.

## Phase 4 — Outreach drafts

Top 15 by fitScore only — assert the cap in code. Claude Sonnet, once each:

```
{
  "dmOpener": "max 40 words, LinkedIn DM, no greeting fluff",
  "emailSubject": "...",
  "emailBody": "150-200 words"
}
```

Lead with the Brahma.Fi → Polymarket acquisition hook, reference something specific from that posting, end with a low-friction ask. Recipient stays `[name]`. No em dashes. Paragraphs of 2–4 sentences. Direct, not eager.

Cache by job ID. Never regenerate.

## Phase 5 — The site

Single page. No routing, no detail views, no search bar.

- Sorted by fitScore desc, then recency.
- Card: company, title, fit score, one-line `why`, posted-age, hireability chip, timezone chip, source badge.
- Actions: **Apply** (original posting, new tab) and **Draft** (expands inline, copy button per variant) when one exists.
- "New since last visit" marker from a localStorage timestamp.
- Filter chips: role family, hireability, timezone, score threshold. Client-side, instant.
- Status: saved / applied / passed. Passed collapses out.
- Header shows total count, funnel counts, last-updated timestamp.

Visual direction: editorial, off-white ground (~#F7F4EF), mono for numbers and scores, sans for prose. Dense but not cramped. Colour reserved strictly for score and hireability. No shadcn defaults, no card shadows, no gradient buttons.

## Phase 6 — Automation

`.github/workflows/refresh.yml`, daily 06:00 IST:

1. `discover.ts` (time-boxed to 10 min)
2. `ingest.ts`
3. `filter.ts` → `score.ts` → `draft.ts`
4. Commit `data/*.json` if changed — `chore: 22 new, 6 shortlisted, +14 companies`
5. Trigger site rebuild

Every script takes `--dry-run`, skipping all Anthropic calls, so I can iterate on parsing for free.

## Build order

Stop and show me output after each step. Do not build ahead.

1. Greenhouse adapter alone, 5 hardcoded slugs, printing to console.
2. Add Lever and Ashby. Shared `Job` type, dedupe.
3. Add the four European adapters — Personio, Teamtailor, Recruitee, Workable. This is where the in-band roles are, so don't defer it.
4. Add SmartRecruiters, with graceful handling of tier-gated 404s.
5. Hard filter, with funnel counts.
6. Static site reading a committed `jobs.json`. No AI yet.
7. Scoring on a 20-job sample, with token cost printed.
8. Registry bootstrap and discovery.
9. Outreach drafts.
10. GitHub Action.

Ask before adding any dependency beyond React, Vite, TypeScript, an XML/RSS parser, and the Anthropic SDK.
