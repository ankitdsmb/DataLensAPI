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
  - Medium: **76**
  - Weak: **63**
- **Launch readiness**
  - Ready: **89**
  - Conditional: **63**
  - Internal-only: **2**
  - Blocked: **2**
- **Free-tier fit**
  - Fit (in explicit safe allowlist): **10**
  - Blocked: **4** (2 async job routes + 2 api-key-stub routes)
  - Not in free-tier allowlist: **140**

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

## Launch blockers (explicit)

### Blocker 1 — Two blocked provider-template endpoints remain non-launchable

- `/api/v1/seo-tools/openpagerank-bulk-checker` (`api-key-stub`)
- `/api/v1/seo-tools/rentcast` (`api-key-stub`)

**Required action:** either strengthen with real provider integration + credential flow, or keep internal-only/defer from public launch.

### Blocker 2 — Simulation-limited async routes are not yet product-grade

- `/api/v1/seo-tools/snapify-capture-screenshot-save-pdf`
- `/api/v1/seo-tools/youtube-rank-checker`
- `/api/v1/seo-tools/traffic-booster`

These routes now have a real async submission and job-status surface, but at least part of the current worker logic is still limited, deterministic, projection-based, degraded-fallback driven, or missing final browser/PDF rendering.

**Required action:** either ship them as clearly internal/preview-only job surfaces or replace worker simulation with provider-grade execution before public launch.

### Blocker 3 — Launch-facing narrative docs still need ongoing truth maintenance

The repo is past the original route-count drift problem, but launch-facing docs still need disciplined upkeep so they do not regress into stale statements about placeholder-only async behavior or missing runtime infrastructure.

**Required action:** rerun the forensic report and keep launch docs aligned whenever route posture changes.

## Weak-route action plan (concrete)

All weak routes now have a concrete next action in the CSV:

- `relabel`: **61** routes (primarily `link-builder` + `shallow-local-utility`)
- `strengthen`: **2** routes (`api-key-stub`)

Action policy for remaining weak routes:

1. **Relabel** as helper/lite utilities where output is URL generation or minimal transformation.
2. **Strengthen** where the product promise requires real external retrieval/analysis.
3. **Internal-only** for risky or abuse-prone classes until hardening is complete.
4. **Remove** if route has low product value and no hardening path.

(Per-route action assignment is in `docs/reports/2026-03-28-launch-readiness-route-classification.csv`.)

## Launch gate decision

## ❌ NO-GO (as of 2026-03-28)

Rationale:

1. Canonical allowlist drift is unresolved.
2. Launch documentation is not fully truthful to current code state.
3. Two routes are explicitly blocked stubs and need strengthen/internal-only enforcement.

## Go criteria for next pass

Launch can move to **GO** when all are true:

1. Allowlist regenerated and includes all 154 live routes (including jobs routes).
2. Blocked stub routes are either strengthened or explicitly kept internal-only with matching docs.
3. Simulation-limited async routes are either strengthened or explicitly kept internal/preview-only with matching docs.
4. Weak-route relabeling is reflected consistently across route contracts and docs.
