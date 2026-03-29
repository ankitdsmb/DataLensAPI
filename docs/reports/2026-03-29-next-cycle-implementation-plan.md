# Next-Cycle Implementation Plan

- Date: 2026-03-29
- Branch: `codex/origin-main-integration`
- Baseline commit: `1571fbe`
- Purpose: define the next execution cycle after the supported-subset launch remediation has been completed and verified.

## Starting point

The current branch is now in this state:

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
- Launch decision:
  - `GO FOR THE SUPPORTED SUBSET`

Operational note:

- Shared API/provider timing has now been hardened to use a monotonic clock, so the earlier negative-duration observability glitch is no longer an active next-cycle blocker.

This means the next cycle should not repeat the broad remediation work we just finished.

The next cycle should focus only on the residual backlog that still matters:

1. blocked provider-template routes,
2. internal-preview async routes,
3. a small number of helper routes worth real expansion,
4. cleanup of routes that should remain helper-only or disappear later.

## What not to do next

1. Do not reopen the traffic/fake-engagement category.
2. Do not widen the free-tier public catalog just because the branch is now in better shape.
3. Do not chase challenge-gated connectors without a believable provider or public-data path.
4. Do not add more ticket-shaped APIs until the remaining weak routes are deliberately resolved.

## Next-cycle phases

### Phase 1: Hold the two provider templates internal-only by default

Routes:

- `/api/v1/seo-tools/openpagerank-bulk-checker`
- `/api/v1/seo-tools/rentcast`

Current decision on this branch:

- Keep both routes as internal-only provider templates by default.
- Do not treat them as near-term public candidates.
- Reconsider only if credentials, quotas, and a stable provider integration plan are explicitly approved later.

Exit criteria:

- route contract,
- launch guard posture,
- planning docs,
- and launch classification

all agree that these are deliberate internal templates unless a later provider approval changes the plan.

### Phase 2: Decide whether the two async preview routes should stay preview-only or graduate further

Routes:

- `/api/v1/seo-tools/snapify-capture-screenshot-save-pdf`
- `/api/v1/seo-tools/youtube-rank-checker`

Current truth:

- both routes have real job submission, status, and artifact behavior,
- both now expose explicit preview retention policy with authenticated-only status/artifact reads,
- both stay excluded from the free-tier profile but can run as credentialed previews outside free-tier mode,
- both are useful internally,
- neither is yet public-grade.

Recommended default:

- do not widen the free-tier launch subset for either route.
- treat both as credentialed preview routes outside free-tier mode until one earns a stronger public-grade posture.

Suggested order:

1. `snapify-capture-screenshot-save-pdf`
   - completed on `codex/origin-main-integration`,
   - now renders real browser screenshot/PDF artifacts,
   - keeps the HTML evidence path as fallback,
   - now limits preview jobs to a 6-hour TTL with 2-hour authenticated artifact retention,
   - and now submits successfully through the gateway in non-free-tier credentialed-preview mode.
2. `youtube-rank-checker`
   - completed on `codex/origin-main-integration`,
   - now uses multi-strategy live result collection with provenance,
    - and now limits preview jobs to a 12-hour TTL with 6-hour authenticated artifact retention,
   - and now runs as a credentialed preview outside free-tier mode,
   - but still needs a decision on further hardening versus permanent preview-only posture.

Exit criteria:

- both routes remain excluded from the free-tier subset,
- one route may later graduate beyond credentialed-preview posture,
- and neither is marketed as a general public route until its evidence path is stable enough.

### Phase 3: Curated expansion only where public evidence is believable

Routes most worth considering next:

- `/api/v1/seo-tools/top-1000-websites-worldwide-country-level`
  - already improved this cycle; only deepen if we add rank-history or better source provenance.
- `/api/v1/seo-tools/showtimes`
  - only if a stable public showtimes source is proven first.
- `/api/v1/seo-tools/x-twitter`
  - only if we intentionally keep it profile-lite or back it with a real provider path later.

Routes that should stay helper/internal-only for now:

- `/api/v1/seo-tools/similarweb`
- `/api/v1/seo-tools/software-advice`
- `/api/v1/seo-tools/spotify`
- `/api/v1/seo-tools/spotify-plus`
- `/api/v1/seo-tools/spyfu`
- `/api/v1/seo-tools/spyfu-bulk-urls`
- `/api/v1/seo-tools/stackshare`
- `/api/v1/seo-tools/the-org`

Exit criteria:

- no challenge-gated connector is expanded speculatively,
- any promoted route has a real evidence path,
- all others remain honest helpers.

### Phase 4: Catalog cleanup and deprecation follow-through

Routes:

- `/api/v1/seo-tools/trayvmy-actor`
- the standardized travel helper family

Actions:

1. Keep `trayvmy-actor` internal and deprecated now.
2. In a later cleanup cycle, remove it once compatibility demand is confirmed to be gone.
3. Keep the travel helper family centralized and avoid re-splitting it into independent pseudo-products.

Exit criteria:

- deprecated routes stay quarantined,
- duplicate helper families do not regress back into route sprawl.

## QA rules for the next cycle

Every next-cycle posture change must keep passing:

- `npm run contract-tests`
- `npm run smoke-tests`
- `npm run regression-tests`

Additionally:

- refresh the deep forensic report,
- refresh the launch-readiness report,
- refresh the route classification CSV,
- update the plan/allowlist docs when route posture changes.

## Best next concrete move

If we start another implementation batch immediately, the best single next move is:

1. make a firm product decision on `openpagerank-bulk-checker` and `rentcast`:
   - permanent internal template, or
   - approved real provider integration with credentials and quota planning.
2. keep `snapify-capture-screenshot-save-pdf` and `youtube-rank-checker` internal-preview while artifact delivery, browser quotas, retention policy, and evidence hardening are tightened.
3. avoid speculative expansion work on challenge-gated connectors unless a real provider or stable public-data path is approved first.

## Bottom line

The repo no longer needs a broad rescue pass.

It now needs disciplined next-cycle choices:

- finish one internal-preview async route properly,
- keep shared observability trustworthy while the supported subset stabilizes,
- keep provider templates honest unless integrations are approved,
- avoid speculative connector work,
- and protect the supported public subset we now actually have.
