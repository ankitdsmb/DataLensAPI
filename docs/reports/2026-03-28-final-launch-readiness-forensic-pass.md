# Final Launch-Readiness Forensic Pass

Date: 2026-03-28

## Scope and method

This pass re-audits **every live API route** by scanning the actual route tree under:

- `apps/api-gateway/app/api/v1/**/route.ts`

Outputs produced in this pass:

1. Route-by-route classification CSV: `docs/reports/2026-03-28-launch-readiness-route-classification.csv`
2. This launch gate narrative report.

Classification dimensions applied per route:

- **Strength** (`strong`, `medium`, `weak`)
- **Coverage** (inferred via `forensic_category` + implementation depth)
- **Free-tier fit** (matches `FREE_TIER_SAFE_ROUTES` vs blocked/non-allowlisted)
- **Launch readiness** (`ready`, `conditional`, `internal-only`, `blocked`)
- **Concrete next action** (`strengthen`, `relabel`, `internal-only`, `remove`-equivalent handled via blocker/action list)

## Route tree re-audit results

- Live routes detected from code: **154**
- Route-by-route rows produced: **154**

Classification summary:

- **Strength**
  - Strong: **15**
  - Medium: **79**
  - Weak: **60**
- **Launch readiness**
  - Ready: **89**
  - Conditional: **47**
  - Internal-only: **4**
  - Blocked: **14**
- **Free-tier fit**
  - Fit (in explicit safe allowlist): **10**
  - Blocked: **18** (12 rejected traffic/fake-engagement routes + 4 internal-only routes + 2 api-key-stub routes)
  - Not in free-tier allowlist: **126**

## Route tree vs allowlist verification

Compared live code routes against `docs/api-plans/route-allowlist.md`.

- Routes in code but missing from allowlist: **0**
- Routes in allowlist but missing from code: **0**

## Docs vs actual code verification

### Confirmed doc drift

1. The major allowlist count drift has been corrected: the canonical route allowlist now reflects all 154 live routes.
2. Some narrative reports still require refresh whenever route posture changes, especially around blocked stubs and simulation-limited async routes.
3. Launch-facing docs must keep distinguishing between:
   - template/provider-stub routes,
   - real async orchestration surfaces,
   - and fully implemented worker outputs.

## Verification evidence

Current branch verification is recorded in:

- `docs/reports/2026-03-29-qa-verification-pass.md`

Verified commands:

- `npm run contract-tests`
- `npm run smoke-tests`
- `npm run regression-tests`

What this evidence now covers:

- shared response envelope and validation behavior,
- async job submission/completion/artifact retrieval for `youtube-rank-checker`,
- public watch-page availability evidence for `youtube-region-restriction-checker`,
- public gateway blocking plus internal worker execution for `snapify-capture-screenshot-save-pdf`,
- provider-template contract assertions for `openpagerank-bulk-checker` and `rentcast`.

## Launch blockers (explicit)

### Blocker 1 — Two blocked provider-template endpoints remain non-launchable

- `/api/v1/seo-tools/openpagerank-bulk-checker` (`api-key-stub`)
- `/api/v1/seo-tools/rentcast` (`api-key-stub`)

**Required action:** either strengthen with real provider integration + credential flow, or keep internal-only/defer from public launch.

### Blocker 2 — Simulation-limited async routes are still internal-only, not public-grade

- `/api/v1/seo-tools/snapify-capture-screenshot-save-pdf`
- `/api/v1/seo-tools/youtube-rank-checker`

These routes now have a real async submission and job-status surface, and both have been strengthened beyond pure placeholders. Even so, at least part of the current worker logic is still limited, degraded-fallback driven, or missing final browser/PDF rendering, so they should remain internal-only or preview-only for now.

**Required action:** either ship them as clearly internal/preview-only job surfaces or replace worker simulation with provider-grade execution before public launch.

### Blocker 3 — Rejected traffic and fake-engagement routes must stay out of the public catalog

The repo now enforces launch governance in code for the highest-risk traffic and fake-engagement class, including:

- traffic simulation routes such as `traffic-booster`, `smart-website-traffic`, and `website-traffic-generator-pro`
- fake-engagement routes such as `youtube-view-generator` and `youtube-view-generator-124-test-events-124-0001`

These are now explicitly rejected from the public catalog in both route responses and launch guard enforcement.

**Required action:** keep them blocked/internal-only and ensure all launch-facing product surfaces continue excluding them.

### Blocker 4 — Launch-facing narrative docs still need ongoing truth maintenance

The repo is past the original route-count drift problem, but launch-facing docs still need disciplined upkeep so they do not regress into stale statements about placeholder-only async behavior or missing runtime infrastructure.

**Required action:** rerun the forensic report and keep launch docs aligned whenever route posture changes.

## Weak-route action plan (concrete)

All weak routes now have a concrete next action in the CSV:

- `relabel`: **60** routes (primarily `link-builder` + `shallow-local-utility`)
- `strengthen`: **3** routes (2 `api-key-stub` routes + `youtube-region-restriction-checker`)

Action policy for remaining weak routes:

1. **Relabel** as helper/lite utilities where output is URL generation or minimal transformation.
2. **Strengthen** where the product promise requires real external retrieval/analysis.
3. **Internal-only** for risky or abuse-prone classes until hardening is complete.
4. **Remove** if route has low product value and no hardening path.

(Per-route action assignment is in `docs/reports/2026-03-28-launch-readiness-route-classification.csv`.)

## Launch gate decision

## ❌ NO-GO (as of 2026-03-28)

Rationale:

1. Two routes are still explicitly blocked provider stubs and need strengthen/internal-only enforcement.
2. The strengthened async routes are useful but still internal-only because execution remains limited relative to the public product promise.
3. The rejected traffic/fake-engagement class must remain excluded from the public catalog.
4. Launch documentation still requires disciplined refresh to stay aligned with route posture.

## Go criteria for next pass

Launch can move to **GO** when all are true:

1. Blocked provider-stub routes are either strengthened or explicitly kept internal-only with matching docs.
2. Simulation-limited async routes are either strengthened to provider-grade execution or explicitly kept internal/preview-only with matching docs.
3. Rejected traffic/fake-engagement routes remain excluded consistently across route contracts, launch guard policy, and launch docs.
4. Weak-route relabeling and route posture are reflected consistently across route contracts and docs.
