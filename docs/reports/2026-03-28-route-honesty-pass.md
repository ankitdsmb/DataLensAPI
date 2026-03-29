# Route Honesty Pass Report

- Date: 2026-03-28
- Scope: weak-route over-promise cleanup for prioritized SEO tools.
- Mission outcome: all prioritized routes are now either explicitly **lite/helper/template** in response contracts or **deferred** for public launch.
- Follow-up governance outcome: rejected traffic and fake-engagement routes now return explicit `rejected_for_public_catalog` contracts instead of generic queued/test placeholders.

## Forensic category definitions used

- `link-builder`: validates input and builds canonical external links only.
- `api-key-stub`: contract is a provider template that requires credentials not wired in the route.
- `queued-placeholder`: route accepts payload but does not execute the underlying heavy workflow.
- `queued-simulated`: route submits into the real job runtime, but current worker output is synthetic, deterministic, or projection-based rather than provider-grade execution.
- `shallow network-wrapper`: route proxies a thin upstream call without meaningful product logic.
- `shallow local-utility`: route only performs minimal local transformation/validation.

## Strengthened vs relabeled vs deferred

| Route | Forensic category | Action taken | Public launch recommendation | Notes |
| --- | --- | --- | --- | --- |
| `/api/v1/seo-tools/business-websites-ranker` | `link-builder` | Relabeled honestly | Public lite/helper | Explicitly labeled seed query builder, not a ranking engine. |
| `/api/v1/seo-tools/similarweb` | `link-builder` | Relabeled honestly | Internal or beta only | Explicitly labeled report URL helper, no analytics scraping claims. |
| `/api/v1/seo-tools/spotify` | `link-builder` | Relabeled honestly | Public lite/helper | Explicitly labeled Spotify query URL helper only. |
| `/api/v1/seo-tools/trustpilot-plus` | `link-builder` | Relabeled honestly | Public lite/helper | Explicitly labeled company lookup helper only. |
| `/api/v1/seo-tools/youtube-region-restriction-checker` | `html-scraper` | Strengthened with public evidence | Public lite/evidence | Fetches the public watch page and parses `playabilityStatus`, `playableInEmbed`, and `availableCountries`; it still does not independently simulate playback from each country. |
| `/api/v1/seo-tools/openpagerank-bulk-checker` | `api-key-stub` | Relabeled honestly | Internal-only until provider integration | Explicit internal provider-template contract with `provider_credentials_required` results and `not_executed` provider state. |
| `/api/v1/seo-tools/rentcast` | `api-key-stub` | Relabeled honestly | Internal-only until provider integration | Explicit internal provider-template contract with normalized lookup helper and `not_executed` provider state. |
| `/api/v1/seo-tools/snapify-capture-screenshot-save-pdf` | `queued-simulated` | Strengthened, but still deferred | Deferred from public launch | Real async job contract now captures live page HTML evidence and metadata, but still does not render screenshot/PDF binaries. |
| `/api/v1/seo-tools/youtube-rank-checker` | `queued-simulated` | Strengthened, but still deferred | Deferred from public launch | Real async job contract now attempts lightweight YouTube search evidence collection, with deterministic fallback if parsing/search access fails. |
| `/api/v1/seo-tools/traffic-booster` | `queued-simulated` | Deferred/de-scoped | Disabled from public launch | Real async job contract exists, but current worker only returns projection-style planning output. |
| `/api/v1/seo-tools/quick-lh` | `queued-placeholder` | Deferred/de-scoped | Hidden from public launch | Route does not exist in current allowlist; keep out of launch surface. |

## Contract truthfulness checks

1. Response payloads for prioritized live routes now include a `contract` object or are policy-gated/job-gated with launch-facing documentation that distinguishes:
   - truthful product label,
   - forensic category,
   - implementation depth,
   - launch recommendation,
   - explicit non-implemented caveat where needed.
2. Public launch guidance is encoded in route docs (`docs/api-plans/route-allowlist.md`) so release governance is machine-auditable by route slug.
3. Async-route honesty now distinguishes between:
   - no runtime at all,
   - real job orchestration with synthetic execution,
   - and future full worker-backed execution.

## Verification evidence

Follow-up QA now exists for the strongest honesty-sensitive routes:

- `npm run smoke-tests`
  - verifies `youtube-rank-checker` async job completion and artifact retrieval
  - verifies `snapify-capture-screenshot-save-pdf` is blocked at the public gateway but succeeds through the internal worker path
- `npm run regression-tests`
  - verifies helper/link-builder contracts
  - verifies `youtube-region-restriction-checker` returns watch-page availability evidence
  - verifies `openpagerank-bulk-checker` and `rentcast` return the expected internal provider-template contracts
