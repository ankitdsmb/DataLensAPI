# Free-Tier Launch Profile (Public)

This deployment profile is intended for safe public hosting on a free-tier server with strict cost and abuse controls.

## Environment variables

Set these in the free-tier deployment:

- `FREE_TIER_LAUNCH_MODE=true`
- `FREE_TIER_API_KEYS=<comma-separated-api-keys>`

When `FREE_TIER_LAUNCH_MODE=true`, only the routes listed below are publicly callable. All other routes are treated as internal-only by default.

## Publicly allowed routes

- `POST /api/v1/seo-tools/url-shortener`
- `POST /api/v1/seo-tools/markdown-table-generator`
- `POST /api/v1/seo-tools/profanity-checker`
- `POST /api/v1/seo-tools/reverse-dictionary-api`
- `POST /api/v1/seo-tools/social-media-hashtag-generator`
- `POST /api/v1/seo-tools/search-keyword-research`
- `POST /api/v1/seo-tools/youtube-suggester`
- `POST /api/v1/seo-tools/google-autocomplete-apify`
- `POST /api/v1/seo-tools/ebay-keywords-discovery-tool`
- `POST /api/v1/seo-tools/app-store-search-suggestions`

## Quarantined/blocked classes

The launch guard rejects routes that are:

- Marked `disabled` or `internal` in launch policy metadata.
- Not part of the free-tier safe allowlist when launch mode is enabled.
- Identified as traffic/fake-engagement style routes (`traffic`, `boost`, `simulator`, `organic-visit`, `bot`).

## Explicitly non-public routes in the current profile

These routes exist in code but should not be presented as part of the free-tier public launch:

- `POST /api/v1/seo-tools/openpagerank-bulk-checker`
  - Provider template only; returns `pending_api_key` until real credentialed integration exists.
- `POST /api/v1/seo-tools/rentcast`
  - Provider template only; returns a lookup helper plus `pending_api_key`.
- `POST /api/v1/seo-tools/snapify-capture-screenshot-save-pdf`
  - Real async job contract exists, but current worker artifacts are synthetic capture records rather than rendered screenshots/PDF binaries.
- `POST /api/v1/seo-tools/youtube-rank-checker`
  - Real async job contract exists, but current worker returns deterministic simulated rank output rather than collected ranking evidence.
- `POST /api/v1/seo-tools/traffic-booster`
  - Real async job contract exists, but current worker returns projection-style planning output and the route is quarantined by policy.
- `GET /api/v1/jobs/:jobId`
- `GET /api/v1/jobs/:jobId/artifacts/:artifactId`
  - Operational surfaces for internal polling and artifact retrieval; not part of the public free-tier catalog.

## Baseline protections in this profile

- API key boundary (required on free-tier-safe routes).
- In-memory per-route rate limiting keyed by client IP + route.
- In-memory per-route concurrency caps.
- Payload and input caps for URL, keyword, crawl-page, and bulk-item counts via policy metadata.

## Deployment note

This profile is intentionally conservative. Public launch should expose only the explicit allowlist above, while template routes, simulation-limited job routes, and abuse-prone traffic routes remain internal, disabled, or deferred until fully implemented.
