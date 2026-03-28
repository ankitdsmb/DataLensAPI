# Post-Integration Findings and Next Steps

Date: 2026-03-28

## Context

The repository has now been safely moved onto the latest upstream state:

- `main` fast-forwarded to `origin/main`
- clean working branch created: `codex/origin-main-integration`
- preserved forensic artifacts carried forward onto the integration branch

This note records the **first findings after integration** and defines the **next implementation order**.

## What changed after integration

After integrating latest upstream and rerunning the local forensic generator:

1. The codebase is clearly in a stronger state than the earlier local snapshot.
2. The old forensic generator assumptions are no longer fully accurate.
3. The top blocker is now **truth drift**, not broad architectural absence.

## Current confirmed findings

### 1. Route-plan drift was the first post-integration blocker, and it has now been resolved

The first integration follow-up pass found three live SEO routes missing from `docs/api-plans/dev-and-seo-tooling-list.md` plus two missing job routes in `docs/api-plans/route-allowlist.md`.

Those gaps have now been synchronized so the canonical allowlist and the route-plan surface reflect:

- `152` live `seo-tools` routes
- `2` live `jobs` routes
- `154` total live routes represented in the allowlist

### 2. The local forensic generator needed modernization, and a first refresh pass is now complete

The pre-refresh generator contained stale assumptions inherited from the earlier local snapshot, for example:

- old GitHub delta wording
- stale architecture-gap wording
- stale conclusions about missing capabilities that latest upstream already partially implements
- hardcoded validation interpretation that no longer reflects current route behavior

Current status:

- the generator has been refreshed enough to handle live-route/plan drift gracefully
- route counts and strict-validation detection now reflect the integrated latest branch
- some narrative sections still require ongoing maintenance as launch posture evolves

### 3. Contract hardening improved materially

The regenerated report now shows:

- `Routes still using raw JSON.parse locally: 0`

That is a major improvement over the earlier state.

### 4. Public launch is still not ready by default

Even after upstream integration and truth sync, the launch-readiness direction remains:

- architecture: much stronger
- truth sync: still incomplete
- blocked routes: still need explicit handling
- simulation-limited async routes: now need explicit public-contract wording
- public launch should remain narrow and policy-gated

## New priority order

The correct next order is now:

## Priority 1 — Launch truth for blocked and simulation-limited routes

The next highest-value work is to make launch-facing docs and route posture fully honest for:

- `openpagerank-bulk-checker`
- `rentcast`
- `snapify-capture-screenshot-save-pdf`
- `youtube-rank-checker`
- `traffic-booster`

Why this matters:

- architecture is now real enough to support async jobs
- but several job-backed routes still return synthetic or preview-grade execution artifacts
- public launch language must distinguish between a real job runtime and fully real provider-backed results

## Priority 2 — Keep the forensic generator and reports current

Keep `scripts/generate-deep-api-forensic-report.mjs` aligned with the integrated latest platform, including:

1. current HEAD instead of older hardcoded snapshot language
2. latest route counts
3. actual strict validation detection
4. current async runtime existence
5. current launch guard / auth / policy reality
6. current family-module architecture

The generator should stop describing old architecture gaps that are no longer true and should keep simulation-limited routes clearly distinguished from fully implemented ones.

## Priority 3 — Strengthen or quarantine the weakest async/public-contract routes

After truth sync, address the routes that remain problematic for launch:

- `openpagerank-bulk-checker`
- `rentcast`
- async routes whose outputs are still synthetic or projection-based

These should be:

- strengthened
- clearly labeled
- or kept internal-only

## Priority 4 — Make one final launch subset decision

Once truth sync and blocked-route handling are done:

1. freeze the free-tier-safe public subset
2. freeze the internal-only subset
3. freeze the blocked/deferred subset
4. update docs and route metadata together

## Practical next task recommendation

If continuing immediately, the most valuable next implementation task is:

### Complete the blocked-route and simulation-limited honesty pass

Concrete targets:

- refresh launch-facing docs so blocked/template routes are clearly non-public
- label simulation-limited async routes as real job surfaces with non-final execution logic
- keep free-tier docs, launch-readiness docs, and forensic notes aligned

## Suggested execution sequence

1. Keep allowlist/plan truth in sync as code changes.
2. Refresh the blocked-route and simulation-limited launch notes.
3. Rerun the forensic generator.
4. Re-check launch blockers.
5. Decide whether to strengthen or keep internal-only the remaining weak routes.

## Final recommendation

Do not jump into more feature work yet.

The repo is finally on the right architectural base. The next win is to make **launch truth, async honesty, and forensic tooling match that new reality**.
