# Provider Template Feasibility Note

- Date: 2026-03-30
- Branch: `codex/origin-main-integration`
- Scope:
  - `/api/v1/seo-tools/openpagerank-bulk-checker`
  - `/api/v1/seo-tools/rentcast`

## Question

Can either remaining provider-template route be turned into a truthful public implementation on this branch **without** introducing paid credentials, licensed provider access, or anti-bot-heavy scraping?

## Findings

### `/api/v1/seo-tools/openpagerank-bulk-checker`

- Current route normalizes `domain` / `domains` input and returns an explicit internal provider-template contract.
- The product promise is specifically about **OpenPageRank** scores.
- There is no first-party OpenPageRank-compatible evidence source in the repo that can honestly produce that metric without provider credentials.
- Replacing it with unrelated public SEO heuristics would change the product identity and make the route misleading.

Conclusion:

- No credible no-credentials implementation path exists for this route in the current branch.
- The honest posture remains: `internal_only_provider_template`.

### `/api/v1/seo-tools/rentcast`

- Current route validates `address` and returns a normalized RentCast lookup URL inside an explicit internal provider-template contract.
- The product promise is specifically about **RentCast-style property/rent data**.
- There is no existing public-data family in the repo that can truthfully substitute for RentCast rent estimates without changing the product contract.
- A fake “compatibility-lite” replacement would mostly be URL generation or non-authoritative real-estate hints, which would not satisfy the named product promise.

Conclusion:

- No credible no-credentials implementation path exists for this route in the current branch.
- The honest posture remains: `internal_only_provider_template`.

## Decision

For the supported subset and the current branch constraints:

1. Keep both routes as permanent internal provider templates by default.
2. Do not start pseudo-implementations that dilute the named provider contract.
3. Reopen either route only if all of the following are approved:
   - credentials or licensed provider access,
   - quota and cost posture,
   - public launch intent,
   - regression and contract coverage for the real provider path.

## Recommended next move

The next meaningful step is **not** more route implementation on these two endpoints.

The next meaningful step is one of:

1. Prepare this branch for review / PR as the current supported-subset milestone.
2. Start a separate, explicitly approved provider-integration track for exactly one route with real credentials.

## Bottom line

The forensic result is clear:

- `openpagerank-bulk-checker` should stay internal-only.
- `rentcast` should stay internal-only.
- This branch is better served by review and integration than by speculative provider work.
