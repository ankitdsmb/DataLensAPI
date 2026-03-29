# QA Verification Pass

- Date: 2026-03-29
- Branch: `codex/origin-main-integration`
- Purpose: record the current executable verification evidence behind the latest contract, launch, and forensic posture updates.

## Commands executed

1. `npm run contract-tests`
2. `npm run smoke-tests`
3. `npm run regression-tests`

## Results

All three commands passed on this branch.

## Coverage provided

### Contract tests

- Verifies the shared API envelope shape.
- Verifies validation error normalization.
- Confirms the request/response wrapper layer still emits the expected metadata and machine-readable error codes.

### Smoke tests

- Starts both `api-gateway` and `scraper-service`.
- Verifies validation failure envelopes for representative live routes.
- Verifies `youtube-rank-checker`:
  - async job submission,
  - terminal job completion,
  - execution metadata,
  - artifact retrieval.
- Verifies `snapify-capture-screenshot-save-pdf`:
  - is blocked at the public gateway because it is internal-only,
  - still executes successfully through the internal worker path,
  - returns live HTML evidence capture output.
- Confirms the smoke harness now exits cleanly after teardown.

### Regression tests

- Verifies the canonical link-builder/helper family still returns the expected helper contracts.
- Verifies `/api/v1/seo-tools/youtube-region-restriction-checker` now returns public watch-page availability evidence, including `playabilityStatus` and `availableCountries`.
- Verifies `/api/v1/seo-tools/trustpilot-plus` now returns public review-page evidence, including aggregate TrustScore-style rating data and total review count for a resolvable company identifier.
- Verifies `/api/v1/seo-tools/business-websites-ranker` now returns public website discovery and lightweight quality-scoring evidence instead of only emitting a seed query URL.
- Verifies `/api/v1/seo-tools/barcode` now returns public product evidence from the OpenFoodFacts catalog for a known UPC/EAN instead of only inferring format from string length.
- Verifies `/api/v1/seo-tools/cms-checker` now returns lightweight CMS and site-stack fingerprint evidence from public HTML instead of only shallow generator hints.
- Verifies `/api/v1/seo-tools/markdown-table-generator` now returns deterministic markdown table output with parsed delimited input, alignment control, escaping, and ragged-row normalization under the route’s API-key launch posture.
- Verifies `/api/v1/seo-tools/social-media-hashtag-generator` now returns deterministic platform-aware hashtag suggestions with grouped output, ranking, duplicate control, and cross-keyword combinations under the route’s API-key launch posture.
- Verifies `/api/v1/seo-tools/open-graph-image-generator` now returns first-party SVG open graph artwork, a previewable data URI, and deterministic theme/layout metadata.
- Verifies `/api/v1/seo-tools/plagiarism-checker` now returns deterministic local n-gram overlap analysis with pairwise match scoring, repeated-phrase evidence, and shared-phrase excerpts across supplied texts.
- Verifies `/api/v1/seo-tools/serp-meta-title-generator` now returns deterministic intent-aware SEO title variants with scoring, brand placement, and pixel/length evidence.
- Verifies `/api/v1/seo-tools/topic-trend-aggregator` now returns deterministic topic clusters with representative phrases, shared tokens, and momentum signals instead of raw string-length scoring.
- Verifies `/api/v1/seo-tools/trending-news` now returns live Google News RSS article metadata, source names, publication times, and feed-level evidence instead of only a search URL.
- Verifies `/api/v1/seo-tools/similar-app-store-applications-finder` now returns public App Store “You Might Also Like” shelf evidence plus source-app metadata instead of only returning a queued app URL.
- Verifies `/api/v1/seo-tools/opentable` now returns public OpenTable restaurant search-state evidence with profile URLs, cuisine, neighborhood, ratings, and reservation signals instead of only returning a search URL.
- Verifies `/api/v1/seo-tools/domain-availability-expiry-whois-dns-ip-asn-70-tld` now returns live DNS availability, normalized A-record summaries, DNS matrix evidence, and HTTPS reachability instead of a single thin A-record response.
- Verifies `/api/v1/seo-tools/profanity-checker` now returns deterministic moderation matches, masking, severity, and custom-word handling while respecting the route’s API-key launch posture.
- Verifies `/api/v1/seo-tools/shopify-product-search` now returns public storefront product evidence from Shopify predictive-search or products-feed endpoints when a `storeUrl` is supplied.
- Verifies `/api/v1/seo-tools/spell-checker` now returns public spelling and grammar match evidence from the LanguageTool public endpoint instead of local suspect-word heuristics.
- Verifies `/api/v1/seo-tools/what-site` now returns a lightweight site profile with final URL, metadata, heading counts, link counts, and content signals instead of only a title/description pair.
- Verifies `/api/v1/seo-tools/whatruns` now returns lightweight technology fingerprint evidence across CMS, frontend, ecommerce, analytics, and infrastructure categories instead of only shallow generator hints.
- Verifies `/api/v1/seo-tools/bulk-bbb` now returns public BBB bulk evidence, including per-company search-result matches, best-match profile enrichment, BBB rating, and complaint signals.
- Verifies `/api/v1/seo-tools/simple-bbb` now returns public BBB evidence, including search-result matches, best-match profile enrichment, BBB rating, and complaint signals.
- Verifies `/api/v1/seo-tools/domain-intelligence-suite` now returns:
  - live DNS lookups,
  - normalized A-record evidence,
  - a DNS matrix snapshot,
  - and a live HTTPS reachability snapshot.
- Verifies the two provider-template routes:
  - `/api/v1/seo-tools/openpagerank-bulk-checker`
  - `/api/v1/seo-tools/rentcast`
- Confirms those routes now return:
  - `status: internal_provider_template`
  - provider metadata
  - `api-key-stub` contract classification
  - `launchRecommendation: internal_only_until_provider_integration`
- Confirms the regression harness now exits cleanly after teardown.

## Forensic significance

This QA pass materially strengthens the repo’s evidence base:

1. Async-route posture is no longer just described in docs; it is exercised end to end.
2. Provider-template posture is no longer only documented; it is asserted in automated regression coverage.
3. The repo now has visible, runnable verification for:
   - contract layer,
   - launch guard behavior,
   - async job lifecycle,
   - artifact serving,
   - public watch-page availability evidence extraction,
   - public Trustpilot review-page aggregate evidence extraction,
   - public business website discovery and scoring evidence extraction,
   - public barcode product evidence extraction,
   - public CMS and site-stack fingerprint extraction,
   - deterministic markdown table generation,
   - deterministic platform-aware hashtag generation,
   - first-party SVG open graph generation,
   - local n-gram plagiarism evidence,
   - deterministic SEO title generation,
   - deterministic topic clustering,
   - public trending news feed evidence extraction,
   - public App Store similar-app shelf evidence extraction,
   - public OpenTable restaurant search-state evidence extraction,
   - live light domain availability evidence,
   - deterministic profanity moderation extraction,
   - public Shopify storefront product evidence extraction,
   - public spelling and grammar evidence extraction,
   - public site-profile evidence extraction,
   - public multi-category technology fingerprint extraction,
   - public BBB bulk search and profile evidence extraction,
   - public BBB search and profile evidence extraction,
   - live domain DNS and HTTP evidence extraction,
   - provider-template route contracts.

## Remaining gaps

Passing QA does **not** change the current launch decision by itself.

The main remaining product gaps are still:

1. real provider integration for the blocked provider-template routes,
2. provider-grade execution for the strengthened but still internal-only async routes,
3. continued exclusion of traffic/fake-engagement routes from the public catalog.
