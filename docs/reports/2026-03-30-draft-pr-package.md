# Draft PR Package: Supported-Subset Milestone

- Date: 2026-03-30
- Branch: `codex/origin-main-integration`

## Suggested PR title

`[codex] Stabilize supported launch subset and harden async/forensic posture`

## Draft PR body

### What changed

This PR stabilizes the launchable subset of the DataLens API instead of expanding the catalog further.

Main outcomes:

- aligned the live route tree with the canonical allowlist and launch docs,
- hardened route truthfulness across weak/helper/internal-only surfaces,
- converted several weak utilities into honest evidence-backed or first-party deterministic routes,
- strengthened async preview execution for `snapify-capture-screenshot-save-pdf` and `youtube-rank-checker`,
- bound preview jobs to the submitting API key and added retention/expiry metadata,
- kept `openpagerank-bulk-checker` and `rentcast` as explicit internal provider templates instead of faking public implementations,
- refreshed the forensic, QA, and launch-readiness reports to match current code.

### Why it changed

The repo had reached a point where launch risk came more from truth drift and uneven route posture than from missing endpoints. This milestone narrows the public promise to a supportable subset and makes the remaining non-public surfaces explicit by design.

### Product impact

- supported public subset remains launchable under the current guardrails,
- `snapify-capture-screenshot-save-pdf` is now an authenticated beta outside the free-tier subset,
- `youtube-rank-checker` is now a credentialed preview-only route with stronger evidence collection and clearer provenance,
- blocked or internal-only routes are documented and enforced consistently in code.

### Key route posture decisions

- `openpagerank-bulk-checker`
  - permanent internal provider template for now
- `rentcast`
  - permanent internal provider template for now
- `snapify-capture-screenshot-save-pdf`
  - authenticated beta, not part of the supported free-tier subset
- `youtube-rank-checker`
  - credentialed preview-only, not part of the supported free-tier subset
- traffic/fake-engagement routes
  - remain blocked from the public catalog

### Validation

Verified on this branch with:

1. `npm run contract-tests`
2. `npm run smoke-tests`
3. `npm run regression-tests`
4. `node scripts/generate-deep-api-forensic-report.mjs`

### Reviewer focus

Highest-signal review targets:

1. `apps/api-gateway/lib/jobs/runtime.ts`
2. `packages/scraping-core/src/launchGuard.ts`
3. `apps/scraper-service/index.js`
4. `apps/api-gateway/app/api/v1/seo-tools/snapify-capture-screenshot-save-pdf/route.ts`
5. `apps/api-gateway/app/api/v1/seo-tools/youtube-rank-checker/route.ts`
6. `scripts/smoke-tests/live-routes.mjs`

### Follow-up after merge

Choose exactly one next track:

1. begin a separately approved provider-integration effort for one internal provider template, or
2. keep the supported subset stable and avoid new surface-area expansion until there is a new forensic pass.
