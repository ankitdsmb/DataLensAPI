# Origin Main Integration and Launch Plan

Date: 2026-03-28

## Why this document exists

The local repository is not in a safe state for a blind `git pull`:

- local branch: `main`
- local HEAD: `14c14b98a5574c3d614ef8ccc815b8aec9afe3fc`
- remote HEAD: `cd10e2ab3fd9ae8426b9af5b86df859c08537088`
- local branch is behind `origin/main` by `20` commits
- local worktree is dirty

Because of that, the next step should not be "merge first and hope." The next step should be a controlled upstream integration pass.

## Latest upstream reality

The latest upstream already contains most of the architecture upgrades that were previously only recommendations:

1. Route-inventory reconciliation work
2. Strict field allowlist validation
3. Shared family extraction for:
   - `siteAudit`
   - `keywordDiscovery`
   - `domainIntelligence`
4. Honest-route / weak-route classification pass
5. Minimal async job runtime
6. Free-tier launch guard
7. Observability and regression/smoke checks
8. Final launch-readiness forensic pass

Key upstream files proving this:

- `packages/scraping-core/src/families/siteAudit.ts`
- `packages/scraping-core/src/families/keywordDiscovery.ts`
- `packages/scraping-core/src/families/domainIntelligence.ts`
- `packages/scraping-core/src/launchGuard.ts`
- `packages/scraping-core/src/observability.ts`
- `apps/api-gateway/lib/jobs/runtime.ts`
- `apps/api-gateway/app/api/v1/jobs/[jobId]/route.ts`
- `docs/free-tier-launch.md`
- `docs/reports/2026-03-28-final-launch-readiness-forensic-pass.md`

## What upstream still says is not done

Upstream is much better, but it is not yet a clean public-launch `GO`.

The final upstream forensic pass says:

- live routes detected: `154`
- launch decision: `NO-GO`

Explicit upstream blockers:

1. allowlist drift
2. route-documentation truth drift
3. blocked stub routes still present:
   - `/api/v1/seo-tools/openpagerank-bulk-checker`
   - `/api/v1/seo-tools/rentcast`

## My current judgment

This repo no longer needs another large architectural rewrite.

It now needs:

1. safe upstream integration
2. truth-sync across code, allowlist, and docs
3. hardening of the new platform edges
4. strict limitation of public launch scope
5. selective strengthening of a few async and weak routes

## Recommended execution order

## Phase 1: Protect local work before integration

Goal: avoid losing current local changes.

Actions:

1. Snapshot current local work into a dedicated branch.
2. Preserve untracked forensic artifacts and scripts.
3. Do not merge directly into dirty `main`.

Suggested branch names:

- `codex/local-forensic-snapshot`
- `codex/origin-main-integration`

Success criteria:

- all current local changes are preserved
- integration work happens on a clean branch

## Phase 2: Rebase or replay onto latest upstream

Goal: get onto `origin/main` without carrying stale local architecture assumptions.

Actions:

1. Create a clean branch from `origin/main`.
2. Replay only local work that is still valuable.
3. Prefer upstream implementations when there is overlap.
4. Re-run builds after replay.

Important rule:

- upstream platform work should win by default unless local work contains newer evidence or better forensic documentation

Success criteria:

- branch is based on `origin/main`
- no accidental reintroduction of old route inventory or stale docs

## Phase 3: Fix truth drift immediately

Goal: make docs and allowlists match live code exactly.

Actions:

1. Regenerate route allowlist from route files.
2. Update route-count-dependent docs.
3. Remove stale references to the older 149-route snapshot.
4. Confirm whether the 3 new suite routes and 2 jobs routes belong in the canonical allowlist.

Files likely needing updates:

- `docs/api-plans/route-allowlist.md`
- `docs/reports/2026-03-28-deep-api-forensic-analysis.md`
- `docs/seo-tools-contract-hardening-report.md`
- `docs/reports/2026-03-28-final-launch-readiness-forensic-pass.md`

Success criteria:

- route inventory in docs equals route inventory in code
- one source of truth exists for launch surface

## Phase 4: Harden the new platform edges

Goal: make the new architecture trustworthy enough for release.

Actions:

1. Verify job routes enforce the same request-id, auth, and policy expectations as tool routes.
2. Review `launchGuard.ts` defaults for:
   - auth
   - visibility
   - quarantine rules
   - free-tier eligibility
3. Review in-memory rate limiting and concurrency assumptions.
4. Confirm all public-safe routes have realistic caps.

Key concern:

- current rate limiting and concurrency tracking are in-memory only, which is fine for one small instance but weak for scaled or restarted environments

Success criteria:

- all public routes have explicit policy
- all async surfaces are guarded consistently

## Phase 5: Decide the real launch subset

Goal: launch only what is safe, honest, and supportable on cheap hosting.

Current upstream public-safe free-tier list is intentionally narrow:

- `/api/v1/seo-tools/url-shortener`
- `/api/v1/seo-tools/markdown-table-generator`
- `/api/v1/seo-tools/profanity-checker`
- `/api/v1/seo-tools/reverse-dictionary-api`
- `/api/v1/seo-tools/social-media-hashtag-generator`
- `/api/v1/seo-tools/search-keyword-research`
- `/api/v1/seo-tools/youtube-suggester`
- `/api/v1/seo-tools/google-autocomplete-apify`
- `/api/v1/seo-tools/ebay-keywords-discovery-tool`
- `/api/v1/seo-tools/app-store-search-suggestions`

Recommendation:

- keep this list narrow for first public launch
- do not expand until after the sync and truth pass is complete

Success criteria:

- launch docs and launch guard agree on the same public-safe set

## Phase 6: Strengthen or quarantine the remaining weak routes

Goal: stop weak routes from diluting the product.

Priority weak/stub routes:

- `/api/v1/seo-tools/openpagerank-bulk-checker`
- `/api/v1/seo-tools/rentcast`
- async routes with simulated worker behavior

Recommendation:

1. keep `openpagerank-bulk-checker` internal-only until real provider integration exists
2. keep `rentcast` internal-only until real provider integration exists
3. clearly label simulated async outputs as preview/internal if they are not fully real

Success criteria:

- no blocked routes are publicly represented as complete products

## Phase 7: Replace simulated async behavior selectively

Goal: turn the new jobs platform into a real product path, one tool at a time.

Current upstream async platform is real enough to be useful, but some worker implementations are still synthetic.

Examples:

- `youtube-rank-checker` uses deterministic simulation
- `snapify-capture-screenshot-save-pdf` produces synthetic artifact records
- `traffic-booster` still produces plan-style output

Recommendation:

1. pick 1 to 2 async routes only
2. make those truly real
3. keep the rest internal or labeled as limited preview

Best candidates:

- `snapify-capture-screenshot-save-pdf`
- `youtube-rank-checker`

Success criteria:

- at least one async route produces genuinely useful non-simulated output

## Phase 8: Final release gate

Goal: only launch after code, docs, and policy all agree.

Required checks:

1. route count in allowlist matches code
2. blocked routes are internal-only or strengthened
3. launch guard matches docs
4. smoke tests pass
5. contract tests pass
6. forensic pass report is regenerated after sync

## Suggested immediate next command sequence

Not to run blindly on dirty `main`, but as the intended operational sequence:

1. create local snapshot branch
2. create clean integration branch from `origin/main`
3. replay only desired local commits/files
4. build and test
5. fix allowlist/doc drift
6. rerun forensic pass

## Recommended launch posture

Current posture should be:

- architecture: mostly ready
- governance/docs: not fully ready
- async platform: partially ready
- weak-route truthfulness: partially ready
- free-tier launch: possible for a very small public subset only

## Final recommendation

Do not start another broad refactor.

Do this instead:

1. integrate latest upstream safely
2. sync truth across code and docs
3. launch only the narrow free-tier-safe subset
4. strengthen async and blocked routes gradually after that
