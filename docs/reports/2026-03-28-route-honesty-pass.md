# Route Honesty Pass Report

- Date: 2026-03-28
- Scope: weak-route over-promise cleanup for prioritized SEO tools.
- Mission outcome: all prioritized routes are now either explicitly **lite/helper/template** in response contracts or **deferred** for public launch.

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
| `/api/v1/seo-tools/youtube-region-restriction-checker` | `link-builder` | Relabeled honestly | Public lite/helper | Explicitly labeled watch URL helper, no restriction telemetry claim. |
| `/api/v1/seo-tools/openpagerank-bulk-checker` | `api-key-stub` | Relabeled honestly | Deferred from public launch | Explicit provider-template labeling and pending API key caveat. |
| `/api/v1/seo-tools/rentcast` | `api-key-stub` | Relabeled honestly | Deferred from public launch | Explicit provider-template labeling and pending API key caveat. |
| `/api/v1/seo-tools/snapify-capture-screenshot-save-pdf` | `queued-simulated` | Deferred/de-scoped | Deferred from public launch | Real async job contract exists, but current worker emits synthetic capture artifact records rather than rendered files. |
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
