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
   - provider-template route contracts.

## Remaining gaps

Passing QA does **not** change the current launch decision by itself.

The main remaining product gaps are still:

1. real provider integration for the blocked provider-template routes,
2. provider-grade execution for the strengthened but still internal-only async routes,
3. continued exclusion of traffic/fake-engagement routes from the public catalog.
