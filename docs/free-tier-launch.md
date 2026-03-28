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

## Baseline protections in this profile

- API key boundary (required on free-tier-safe routes).
- In-memory per-route rate limiting keyed by client IP + route.
- In-memory per-route concurrency caps.
- Payload and input caps for URL, keyword, crawl-page, and bulk-item counts via policy metadata.
