# Remaining Weak Route Prioritization

- Date: 2026-03-29
- Branch: `codex/origin-main-integration`
- Commit audited: `127ca60`
- Scope: all remaining `weak` routes after the latest Zapier and barcode hardening pass, with emphasis on the `19` weak routes that are still `conditional` rather than already blocked/internal-only.

## Current forensic state

- Live routes: `154`
- Strength summary:
  - `strong: 16`
  - `medium: 105`
  - `weak: 33`
- Remaining weak routes split into:
  - `19` conditional weak routes
  - `14` blocked/internal weak routes

## What still remains

There are still four real buckets of remaining work:

1. Provider-template routes that are still not real products.
   - `/api/v1/seo-tools/openpagerank-bulk-checker`
   - `/api/v1/seo-tools/rentcast`
2. Internal-only async routes that are useful but not yet public-grade.
   - `/api/v1/seo-tools/snapify-capture-screenshot-save-pdf`
   - `/api/v1/seo-tools/youtube-rank-checker`
3. Rejected traffic and fake-engagement routes that must stay blocked.
4. The last `19` weak conditional routes that still need a firm product decision.

## Executive recommendation

Do not try to “fully implement everything” in the remaining weak list. The current evidence strongly suggests a selective strategy:

- Implement or re-scope only the few routes with believable public-data paths.
- Merge or relabel duplicate travel helpers rather than deepening them independently.
- Keep challenge-gated or login-walled connectors as helpers/internal-only until a real provider path exists.
- Remove routes with no coherent product identity.

## Priority order

### P0: resolve product-truth blockers first

| Route | Current state | Recommendation | Why |
| --- | --- | --- | --- |
| `/api/v1/seo-tools/openpagerank-bulk-checker` | Internal provider template | Implement real provider integration or keep permanently internal-only | It is still a non-product in public terms. |
| `/api/v1/seo-tools/rentcast` | Internal provider template | Implement real provider integration or keep permanently internal-only | Same issue as above. |
| `/api/v1/seo-tools/snapify-capture-screenshot-save-pdf` | Authenticated beta browser-rendered route outside free-tier | Hold the current authenticated-beta posture and monitor abuse/ops data before any broader promotion | Real screenshot/PDF rendering now exists, plus public-host validation and render/artifact budgets; the remaining question is whether it ever deserves promotion beyond non-free-tier authenticated use. |
| `/api/v1/seo-tools/youtube-rank-checker` | Credentialed preview async evidence route | Keep preview-only until the evidence path becomes more stable | Multi-strategy evidence parsing and provenance now exist, but the route still depends on fragile public search markup and degraded fallback. |

### P1: strongest remaining conditional candidates

These are the only weak conditional routes that currently have a believable path to become materially better without paid credentials or heavy anti-bot work.

| Route | Commercial value | Public-data feasibility | Difficulty | Recommendation | Forensic reasoning |
| --- | --- | --- | --- | --- | --- |
| `/api/v1/seo-tools/top-1000-websites-worldwide-country-level` | High | Medium | Medium | Re-scope and implement as a Tranco-based global popularity route | Public Tranco rank APIs are available, but the current country-level promise is too broad. This should become a truthful global-rank or rank-history route, not remain a fake queued surface. |
| `/api/v1/seo-tools/x-twitter` | High | Low-Medium | High | Split into `username-only` public-lite or keep helper/internal-only | Query search is not realistically implementable on public X surfaces, but a narrower public profile-lite path may be feasible later. Current mixed search/profile helper contract is too weak for the product label. |
| `/api/v1/seo-tools/showtimes` | Medium | Low-Medium | Medium | Keep helper for now unless a stable public showtimes source is found | The current Google search helper is too thin, but there is no clearly proven stable surface in this repo yet. This is only worth strengthening if we find a durable public cinema/showtimes source. |

### P2: merge and relabel travel-helper duplicates

These routes are mostly lightweight search-link generators around travel discovery surfaces that are commonly challenge-gated. They should not be deepened independently in their current form.

| Route | Commercial value | Public-data feasibility | Difficulty | Recommendation | Forensic reasoning |
| --- | --- | --- | --- | --- | --- |
| `/api/v1/seo-tools/car-hire-rental` | Medium | Low | Medium | Merge into a travel-helper family and relabel | It is just a Skyscanner car-hire URL builder. |
| `/api/v1/seo-tools/car-hire-rental-bulk` | Low-Medium | Low | Medium | Fold into the same helper family or remove | Bulk URL generation alone is not strong enough to justify a separate SKU. |
| `/api/v1/seo-tools/skyscanner-cars` | Medium | Low | Medium | Merge with `car-hire-rental` | Duplicate helper value, same upstream problem. |
| `/api/v1/seo-tools/skyscanner-hotels` | Medium | Low | Medium | Keep as helper or merge into travel-search-helpers | Current implementation is only a search URL. |
| `/api/v1/seo-tools/tripadvisor-cruises` | Medium | Low | High | Keep helper/internal-only | Tripadvisor surfaces are anti-bot heavy; current route has no evidence path. |
| `/api/v1/seo-tools/tripadvisor-hotels` | High | Low | High | Keep helper/internal-only | Commercially better than cruises, but public scraping path is weak today. |
| `/api/v1/seo-tools/vrbo` | Medium | Low | High | Keep helper/internal-only | Public site appears bot-protected; current helper posture is the honest one. |

### P3: keep as helper unless a real provider path exists

These routes point at commercially valuable domains, but the public evidence path is currently challenge-gated, login-gated, or too brittle to justify near-term implementation.

| Route | Commercial value | Public-data feasibility | Difficulty | Recommendation | Forensic reasoning |
| --- | --- | --- | --- | --- | --- |
| `/api/v1/seo-tools/similarweb` | High | Low | High | Keep helper or move internal-only until provider path exists | Valuable product area, but current surface is only a report URL and Similarweb is not a clean public scrape target. |
| `/api/v1/seo-tools/software-advice` | Medium | Low | High | Keep helper/internal-only | Observed Cloudflare blocking makes it a poor near-term candidate. |
| `/api/v1/seo-tools/spotify` | Medium | Low | High | Keep helper | Honest search helper is currently more truthful than a fake “Spotify data” API. |
| `/api/v1/seo-tools/spotify-plus` | Low | Low | High | Collapse into `spotify` helper or remove | Adds little product value beyond the base helper route. |
| `/api/v1/seo-tools/spyfu` | High | Low | High | Keep helper/internal-only until provider-backed integration exists | Valuable domain, but no real public evidence path is wired here. |
| `/api/v1/seo-tools/spyfu-bulk-urls` | Medium | Low | High | Collapse into a helper tier or remove | Bulk helper without evidence extraction is not a strong standalone API. |
| `/api/v1/seo-tools/stackshare` | Medium | Low | High | Keep helper/internal-only | Public search surface is checkpoint-gated. |
| `/api/v1/seo-tools/the-org` | Medium | Low | High | Keep helper/internal-only | Public search path appears login-gated. |

### P4: remove or quarantine low-identity routes

| Route | Commercial value | Public-data feasibility | Difficulty | Recommendation | Forensic reasoning |
| --- | --- | --- | --- | --- | --- |
| `/api/v1/seo-tools/trayvmy-actor` | Very low | None | Low | Remove or quarantine permanently | It has no coherent public product identity and only returns `queued`. It reads like an accidental carryover rather than a defensible route. |

## Strict route-by-route action matrix

| Route | Current logic | Best action now | Phase |
| --- | --- | --- | --- |
| `/api/v1/seo-tools/car-hire-rental` | Single Skyscanner URL helper | Merge + relabel | P2 |
| `/api/v1/seo-tools/car-hire-rental-bulk` | Bulk Skyscanner URL helper | Merge + relabel or remove | P2 |
| `/api/v1/seo-tools/showtimes` | Google search helper | Keep helper unless stable source found | P1 |
| `/api/v1/seo-tools/similarweb` | Similarweb report URL helper | Keep helper/internal-only | P3 |
| `/api/v1/seo-tools/skyscanner-cars` | Skyscanner car search helper | Merge + relabel | P2 |
| `/api/v1/seo-tools/skyscanner-hotels` | Skyscanner hotel search helper | Merge + relabel | P2 |
| `/api/v1/seo-tools/software-advice` | Search URL helper | Keep helper/internal-only | P3 |
| `/api/v1/seo-tools/spotify` | Spotify search URL helper | Keep helper | P3 |
| `/api/v1/seo-tools/spotify-plus` | Duplicate Spotify helper | Collapse or remove | P3 |
| `/api/v1/seo-tools/spyfu` | SpyFu report helper | Keep helper/internal-only | P3 |
| `/api/v1/seo-tools/spyfu-bulk-urls` | Bulk SpyFu report helpers | Collapse or remove | P3 |
| `/api/v1/seo-tools/stackshare` | Stackshare search helper | Keep helper/internal-only | P3 |
| `/api/v1/seo-tools/the-org` | The Org search helper | Keep helper/internal-only | P3 |
| `/api/v1/seo-tools/top-1000-websites-worldwide-country-level` | Fake queued route | Re-scope and implement | P1 |
| `/api/v1/seo-tools/trayvmy-actor` | Empty queued route | Remove/quarantine | P4 |
| `/api/v1/seo-tools/tripadvisor-cruises` | Tripadvisor search helper | Keep helper/internal-only | P2 |
| `/api/v1/seo-tools/tripadvisor-hotels` | Tripadvisor search helper | Keep helper/internal-only | P2 |
| `/api/v1/seo-tools/vrbo` | Vrbo search helper | Keep helper/internal-only | P2 |
| `/api/v1/seo-tools/x-twitter` | Search/profile helper | Split and narrow or keep helper | P1 |

## Best next execution plan

1. Decide the fate of the provider-template and internal-only async blockers.
2. Re-scope `/api/v1/seo-tools/top-1000-websites-worldwide-country-level` into a truthful public-data route.
3. Collapse the duplicate travel-helper family into fewer, more honest helper endpoints.
4. Remove or quarantine `trayvmy-actor`.
5. Leave challenge-gated connectors as helpers until there is a real provider or stable public evidence path.

## Bottom line

Yes, meaningful work still remains, but the repo is no longer in a vague state.

The remaining work is now mostly decision work:

- which routes deserve real implementation,
- which routes should stay honest helpers,
- which routes should be internal-only,
- and which routes should be removed.

That is a much better problem than the repo had earlier.
