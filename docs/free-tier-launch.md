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
  - Provider template only; returns `internal_provider_template` with `provider_credentials_required` results until real credentialed integration exists.
- `POST /api/v1/seo-tools/rentcast`
  - Provider template only; returns a normalized lookup helper plus `internal_provider_template` until real credentialed integration exists.
- `POST /api/v1/seo-tools/snapify-capture-screenshot-save-pdf`
  - Real async job contract exists and now renders screenshot/PDF artifacts in an internal browser worker, with authenticated-only status/artifact access, a 6-hour job TTL, and a 2-hour artifact-retention window. It remains non-public until browser execution controls and broader abuse safeguards are hardened.
- `POST /api/v1/seo-tools/youtube-rank-checker`
  - Real async job contract exists and now attempts lightweight YouTube search evidence collection, with authenticated-only status/artifact access, a 12-hour job TTL, and a 6-hour artifact-retention window. It still falls back when live evidence cannot be collected.
- `POST /api/v1/seo-tools/trayvmy-actor`
  - Deprecated internal compatibility stub only; performs no automation and is intentionally excluded from the public product story.
- `POST /api/v1/seo-tools/traffic-booster`
  - Real async job contract exists, but current worker returns projection-style planning output and the route is quarantined by policy.
- Rejected from the public catalog entirely because they are traffic/fake-engagement tools:
  - `POST /api/v1/seo-tools/new-web-traffic-generator-youtube-vimeo-twitch`
  - `POST /api/v1/seo-tools/organic-visit-simulator-x`
  - `POST /api/v1/seo-tools/smart-website-traffic`
  - `POST /api/v1/seo-tools/traffic-booster`
  - `POST /api/v1/seo-tools/traffic-generator-youtube-web-etsy-behance-and-many-more`
  - `POST /api/v1/seo-tools/web-traffic-boots`
  - `POST /api/v1/seo-tools/web-traffic-spike-simulator-x`
  - `POST /api/v1/seo-tools/website-traffic-generator-pro`
  - `POST /api/v1/seo-tools/website-traffic-machine`
  - `POST /api/v1/seo-tools/websites-traffic-generator`
  - `POST /api/v1/seo-tools/youtube-view-generator`
  - `POST /api/v1/seo-tools/youtube-view-generator-124-test-events-124-0001`
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
