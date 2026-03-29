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
- Verifies `/api/v1/seo-tools/shopify-product-search` now returns public storefront product evidence from Shopify predictive-search or products-feed endpoints when a `storeUrl` is supplied.
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
   - public Shopify storefront product evidence extraction,
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
