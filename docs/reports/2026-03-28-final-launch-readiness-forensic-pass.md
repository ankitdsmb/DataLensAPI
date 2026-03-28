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

- Routes in code but missing from allowlist: **5**
- Routes in allowlist but missing from code: **0**

Missing-from-allowlist live routes:

1. `/api/v1/jobs/[jobId]`
2. `/api/v1/jobs/[jobId]/artifacts/[artifactId]`
3. `/api/v1/seo-tools/domain-intelligence-suite`
4. `/api/v1/seo-tools/search-suggestions-explorer`
5. `/api/v1/seo-tools/site-audit-suite`

## Docs vs actual code verification

### Confirmed doc drift

1. `docs/api-plans/route-allowlist.md` still reports 149 routes and only `seo-tools`, but code now has 154 routes including `jobs/*` and 3 additional SEO suite routes.
2. `docs/reports/2026-03-28-deep-api-forensic-analysis.md` still states 149 local routes.
3. `docs/seo-tools-contract-hardening-report.md` states 149 routes upgraded.
4. `docs/api-plans/route-allowlist.md` still carries a recommendation row for `/api/v1/seo-tools/quick-lh`, which is not a live route.

## Launch blockers (explicit)

### Blocker 1 — Canonical allowlist drift

The canonical allowlist is stale relative to executable code (+5 live routes not listed). This breaks product-surface governance and release auditability.

**Required action:** regenerate and publish `docs/api-plans/route-allowlist.md` directly from route files before launch.

### Blocker 2 — Route-documentation truth drift

Multiple operational documents still anchor to the old 149-route snapshot. This creates a mismatch between launch docs and deployable reality.

**Required action:** update route-count-dependent docs in the same PR as allowlist refresh.

### Blocker 3 — Two blocked endpoints remain non-launchable

- `/api/v1/seo-tools/openpagerank-bulk-checker` (`api-key-stub`)
- `/api/v1/seo-tools/rentcast` (`api-key-stub`)

**Required action:** either strengthen with real provider integration + credential flow, or keep internal-only/defer from public launch.

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
2. Route-count-dependent docs are synced to code.
3. Blocked stub routes are either strengthened or explicitly kept internal-only with matching docs.
4. Weak-route relabeling is reflected consistently across route contracts and docs.
