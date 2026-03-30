# Review Handoff: Supported-Subset Milestone

- Date: 2026-03-30
- Branch: `codex/origin-main-integration`
- Current HEAD: `e0284ed`

## Purpose

This note packages the current branch for review as the supported-subset milestone after the remediation, async hardening, and provider-feasibility passes.

## Recommended review framing

Suggested PR title:

- `Stabilize supported launch subset and harden async/forensic posture`

Suggested reviewer lens:

1. route-contract truthfulness,
2. launch-guard posture,
3. async job ownership and retention,
4. forensic/doc sync,
5. regression safety for the supported subset.

## What changed in this milestone

### 1. Supported-subset remediation was completed

Baseline milestone commit:

- `1571fbe` — implemented the phase-wise launch remediation plan

This established:

- route/allowlist truth alignment,
- helper/travel/helper-over-helper cleanup,
- internal-only and blocked-route honesty,
- launch docs aligned with actual code.

### 2. Async routes were hardened instead of over-promoted

Key commits:

- `1b523de` — added browser-backed `snapify` preview execution
- `6f04dd6` — hardened `youtube-rank-checker` evidence collection
- `4836fae` — added preview retention and artifact-expiry policy
- `2e9176f` — enabled authenticated non-free-tier preview posture
- `83a6948` — hardened `snapify` public-host and artifact-budget controls
- `08b2b59` — hardened `youtube-rank-checker` validation and browser fallback
- `019a601` — bound preview jobs to the submitting API key
- `fdd6a45` — exposed preview ownership in job envelopes
- `53ecab9` — froze async route posture

Current async posture:

- `snapify-capture-screenshot-save-pdf`
  - stable authenticated beta outside free-tier mode
- `youtube-rank-checker`
  - credentialed preview-only outside free-tier mode

### 3. Provider-template routes were intentionally *not* faked

Key commits:

- `0372287` — unified provider-template responses
- `5f65052` — made provider-template defaults permanent/internal
- `e0284ed` — recorded provider feasibility decision

Current provider-template posture:

- `openpagerank-bulk-checker`
  - internal-only provider template
- `rentcast`
  - internal-only provider template

The branch now explicitly rejects speculative no-credential pseudo-implementations for those routes.

### 4. Observability was stabilized

Key commits:

- `0ec2fb0` — switched shared timing to a monotonic clock
- `390294f` — synced the observability hardening into the forensic trail

Result:

- request/provider `duration_ms` is no longer vulnerable to wall-clock skew during long verification runs.

## Verification evidence

The current review bundle is backed by:

- [2026-03-29-qa-verification-pass.md](/mnt/c/docker/DataLensAPI/DataLensAPI/docs/reports/2026-03-29-qa-verification-pass.md)
- [2026-03-28-final-launch-readiness-forensic-pass.md](/mnt/c/docker/DataLensAPI/DataLensAPI/docs/reports/2026-03-28-final-launch-readiness-forensic-pass.md)
- [2026-03-28-deep-api-forensic-analysis.md](/mnt/c/docker/DataLensAPI/DataLensAPI/docs/reports/2026-03-28-deep-api-forensic-analysis.md)

Most important verified commands:

1. `npm run contract-tests`
2. `npm run smoke-tests`
3. `npm run regression-tests`
4. `node scripts/generate-deep-api-forensic-report.mjs`

## Current launch truth

From the latest synced forensic artifacts:

- Live routes: `154`
- Strength:
  - `strong: 16`
  - `medium: 106`
  - `weak: 32`
- Launch readiness:
  - `ready: 89`
  - `conditional: 46`
  - `internal-only: 5`
  - `blocked: 14`
- Route inventory drift:
  - code but missing from allowlist: `0`
  - allowlist but missing from code: `0`

Launch decision:

- `GO FOR THE SUPPORTED SUBSET`

## Intentionally excluded from public launch

These are still excluded by design and should not be treated as review misses:

1. `openpagerank-bulk-checker`
2. `rentcast`
3. `snapify-capture-screenshot-save-pdf` from the free-tier subset
4. `youtube-rank-checker` from the free-tier subset
5. rejected traffic/fake-engagement routes
6. `trayvmy-actor`

## Recommended reviewer focus

If reviewers want the fastest high-signal pass, focus on:

1. [apps/api-gateway/lib/jobs/runtime.ts](/mnt/c/docker/DataLensAPI/DataLensAPI/apps/api-gateway/lib/jobs/runtime.ts)
2. [packages/scraping-core/src/launchGuard.ts](/mnt/c/docker/DataLensAPI/DataLensAPI/packages/scraping-core/src/launchGuard.ts)
3. [apps/api-gateway/app/api/v1/seo-tools/snapify-capture-screenshot-save-pdf/route.ts](/mnt/c/docker/DataLensAPI/DataLensAPI/apps/api-gateway/app/api/v1/seo-tools/snapify-capture-screenshot-save-pdf/route.ts)
4. [apps/api-gateway/app/api/v1/seo-tools/youtube-rank-checker/route.ts](/mnt/c/docker/DataLensAPI/DataLensAPI/apps/api-gateway/app/api/v1/seo-tools/youtube-rank-checker/route.ts)
5. [apps/scraper-service/index.js](/mnt/c/docker/DataLensAPI/DataLensAPI/apps/scraper-service/index.js)
6. [scripts/smoke-tests/live-routes.mjs](/mnt/c/docker/DataLensAPI/DataLensAPI/scripts/smoke-tests/live-routes.mjs)

## Best next step after review

After branch review, the next meaningful action should be exactly one of:

1. merge this supported-subset milestone as-is, or
2. start a separate provider-integration track for one approved provider-template route with real credentials.
