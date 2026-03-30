# DataLens API Remediation Execution Plan

- Date: 2026-03-29
- Branch baseline: `codex/origin-main-integration`
- Purpose: capture the executed remediation-plan baseline and point future work at the next-cycle backlog.

## Status

The phase-wise remediation plan described in this document has now been implemented on this branch through commit `1571fbe`.

For the follow-up cycle, use:

- `docs/reports/2026-03-29-next-cycle-implementation-plan.md`

## Source reports

This plan is based on:

- `docs/reports/2026-03-28-deep-api-forensic-analysis.md`
- `docs/reports/2026-03-28-final-launch-readiness-forensic-pass.md`
- `docs/reports/2026-03-29-qa-verification-pass.md`
- `docs/reports/2026-03-29-remaining-weak-route-prioritization.md`

## Current repo truth

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
  - routes in code but missing from allowlist: `0`
  - routes in allowlist but missing from code: `0`

## What this plan replaces

This plan supersedes the earlier broad rollout mindset of "build many more families next."

That is no longer the repo's main problem.

The current problem is narrower:

1. finish the last product-truth blockers,
2. decide which weak routes deserve strengthening,
3. keep challenge-gated and abuse-prone routes honest,
4. tighten launch posture around the subset we can actually support.

## Delivery rules

1. Do not expand the public catalog until the remaining blockers are resolved.
2. Prefer route truth over marketing breadth.
3. Strengthen only where there is a believable public-data or first-party implementation path.
4. Merge duplicate helper routes instead of deepening them independently.
5. Keep fake-engagement and traffic-simulation classes blocked.
6. Refresh forensic and launch docs after every posture-changing route upgrade.
7. Keep QA green after each batch with:
   - `npm run contract-tests`
   - `npm run smoke-tests`
   - `npm run regression-tests`

## Workstreams

### Workstream A: Launch blockers

Focus on routes that still block a `GO` decision.

### Workstream B: Weak-route triage

Reduce the remaining `weak` surface by strengthening, merging, relabeling, or removing.

### Workstream C: Governance and catalog truth

Keep allowlist, launch docs, and route contracts aligned.

### Workstream D: QA and release evidence

Every posture change must remain backed by runnable verification.

## Phase 0: Freeze the launch surface

### Objective

Prevent scope drift while the remaining blocker work is completed.

### Actions

1. Treat the current route tree plus `docs/api-plans/route-allowlist.md` as the canonical inventory.
2. Do not add new public families during this plan.
3. Keep the rejected traffic and fake-engagement routes blocked in code and excluded from launch docs.
4. Keep `openpagerank-bulk-checker` and `rentcast` out of public launch; keep `snapify-capture-screenshot-save-pdf` outside the free-tier subset as a stable authenticated beta with submitter-bound preview reads, and keep `youtube-rank-checker` outside the free-tier subset as a credentialed preview-only route with submitter-bound preview reads.

### Exit criteria

- No new launch-surface drift.
- No public documentation implies these four routes are launch-ready.

## Phase 1: Resolve the hard launch blockers

### Objective

Close the items that still make the launch gate read `NO-GO`.

### Targets

| Route | Current posture | Required decision |
| --- | --- | --- |
| `/api/v1/seo-tools/openpagerank-bulk-checker` | blocked provider template | real provider integration or permanent internal-only |
| `/api/v1/seo-tools/rentcast` | blocked provider template | real provider integration or permanent internal-only |
| `/api/v1/seo-tools/snapify-capture-screenshot-save-pdf` | authenticated beta browser-rendered route outside free-tier | keep as the stable non-free-tier beta path unless a separately approved launch-hardening phase broadens it later |
| `/api/v1/seo-tools/youtube-rank-checker` | credentialed preview-only async evidence route outside free-tier | keep preview-only by default until a materially more stable evidence source is approved |

### Actions

1. Decide route-by-route whether each target will be:
   - fully implemented now,
   - explicitly internal-only for launch,
   - or deferred from the public roadmap.
2. If implemented:
   - replace template/degraded execution with real provider-grade execution,
   - add regression coverage,
   - refresh launch posture docs.
3. If kept internal-only:
   - make contracts explicit,
   - make launch docs explicit,
   - keep guardrails in code.

### Exit criteria

- None of the four blocker routes are in an ambiguous state.
- Launch docs, route contracts, and QA posture all agree on their status.

## Phase 2: Upgrade the few weak routes that are actually worth it

### Objective

Only strengthen weak routes with believable product upside and feasible public evidence paths.

### Priority set

| Route | Recommended action | Reason |
| --- | --- | --- |
| `/api/v1/seo-tools/top-1000-websites-worldwide-country-level` | re-scope and implement | current `queued` behavior is indefensible; a truthful Tranco-style global-rank route is feasible |
| `/api/v1/seo-tools/x-twitter` | narrow or split | current mixed search/profile helper is too weak; only a narrower public-lite version is believable |
| `/api/v1/seo-tools/showtimes` | keep helper unless stable source is found | only worth deeper work if a durable public showtimes source is identified |

### Actions

1. Re-scope `top-1000-websites-worldwide-country-level` into a truthful route with a narrower public promise.
2. Decide whether `x-twitter` becomes:
   - a narrower profile-lite route,
   - an internal helper,
   - or a candidate for later provider-backed work.
3. Leave `showtimes` as helper unless we first prove a stable public evidence path.

### Exit criteria

- The P1 set no longer contains fake queued behavior.
- Public promises are narrower and true.

## Phase 3: Collapse duplicate travel helpers

### Objective

Stop spending maintenance on multiple near-identical weak helper routes.

### Routes in scope

- `/api/v1/seo-tools/car-hire-rental`
- `/api/v1/seo-tools/car-hire-rental-bulk`
- `/api/v1/seo-tools/skyscanner-cars`
- `/api/v1/seo-tools/skyscanner-hotels`
- `/api/v1/seo-tools/tripadvisor-cruises`
- `/api/v1/seo-tools/tripadvisor-hotels`
- `/api/v1/seo-tools/vrbo`

### Actions

1. Merge Skyscanner car routes into one honest helper family.
2. Decide whether the bulk helper has enough value to survive as a separate route.
3. Keep anti-bot travel surfaces honest as helpers or internal-only.
4. Remove duplicate marketing language that implies deep scraping where only search-helper behavior exists.

### Exit criteria

- Fewer duplicate helper routes.
- Travel routes have clearer names and expectations.
- No travel helper over-promises data depth.

## Phase 4: Keep challenge-gated connectors honest

### Objective

Avoid burning time on routes that still do not have a credible implementation path.

### Routes in scope

- `/api/v1/seo-tools/similarweb`
- `/api/v1/seo-tools/software-advice`
- `/api/v1/seo-tools/spotify`
- `/api/v1/seo-tools/spotify-plus`
- `/api/v1/seo-tools/spyfu`
- `/api/v1/seo-tools/spyfu-bulk-urls`
- `/api/v1/seo-tools/stackshare`
- `/api/v1/seo-tools/the-org`

### Actions

1. Keep them as helpers or internal-only until a real provider path exists.
2. Collapse duplicate pairs where the extra SKU adds no real value:
   - `spotify` / `spotify-plus`
   - `spyfu` / `spyfu-bulk-urls`
3. Clean route copy so these do not read like full data APIs.

### Exit criteria

- No challenge-gated connector is pretending to be deeper than it is.
- Duplicate helper SKUs are reduced where possible.

## Phase 5: Remove or quarantine low-identity routes

### Objective

Eliminate routes that do not belong in a focused product catalog.

### Target

| Route | Recommendation |
| --- | --- |
| `/api/v1/seo-tools/trayvmy-actor` | remove or permanently quarantine |

### Actions

1. Decide whether the route has any defensible product role.
2. If not, remove it from the public plan and route tree.
3. If kept, force an internal-only/template posture everywhere.

### Exit criteria

- `trayvmy-actor` is no longer ambiguous.

## Phase 6: Re-run the launch gate

### Objective

Turn remediation work into a fresh release decision.

### Actions

1. Refresh:
   - `docs/reports/2026-03-28-deep-api-forensic-analysis.md`
   - `docs/reports/2026-03-28-final-launch-readiness-forensic-pass.md`
   - `docs/reports/2026-03-28-launch-readiness-route-classification.csv`
   - `docs/reports/2026-03-29-qa-verification-pass.md`
2. Recompute the route counts and weak-route inventory.
3. Re-check code vs allowlist drift.
4. Run the full QA suite again.
5. Publish a new `GO` / `NO-GO` decision.

### Exit criteria

- Launch posture is backed by fresh forensic evidence.
- Counts, docs, and route contracts match.

## Recommended execution order

1. Phase 1: launch blockers
2. Phase 2: high-value weak upgrades
3. Phase 3: duplicate travel-helper cleanup
4. Phase 4: challenge-gated helper cleanup
5. Phase 5: remove/quarantine low-identity routes
6. Phase 6: refresh launch gate

## What not to work on during this plan

Do not spend remediation time trying to public-launch these classes:

- traffic simulation routes
- fake engagement routes
- fake view generators
- other abuse-prone "growth" surfaces already blocked by launch guard

These should remain blocked unless product governance explicitly changes.

## Definition of done for this plan

This plan is complete when all of the following are true:

1. The four hard launch blockers have a final, explicit posture.
2. The highest-value weak routes have either been strengthened or decisively narrowed.
3. Duplicate helper families have been collapsed where they add no independent value.
4. Challenge-gated helpers are honestly positioned.
5. Low-identity carryover routes are removed or quarantined.
6. The forensic reports and launch docs have been refreshed.
7. The repo can be re-evaluated for a `GO` launch decision on the supported subset.
