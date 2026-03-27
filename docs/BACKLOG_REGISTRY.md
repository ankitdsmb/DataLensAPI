# DataLens Canonical Backlog Registry

## Purpose

This registry is the working Phase 0 backlog lock for DataLens.

It converts the raw ticket dump into canonical API families so implementation can be planned by shared platform capability instead of one ticket per endpoint.

## Status Model

- `build-now`: launch candidate after foundation work is in place.
- `build-after-foundation`: valuable, but blocked on shared runtime or policy work.
- `build-later`: valid family, but lower urgency or higher risk.
- `template-only`: keep as connector template, not a bespoke product family.
- `build-selectively`: only implement if a strong use case appears.
- `do-not-add`: explicitly excluded from the public roadmap.

## build-now

| Family | Category | Wave | Endpoint | ToolNexus Slug |
| --- | --- | --- | --- | --- |
| `keyword-density-and-presence-audit` | seo-tools | W1 | `/api/v1/seo-tools/keyword-density-audit` | `keyword-density-audit` |
| `search-suggestions-explorer` | seo-tools | W1 | `/api/v1/seo-tools/search-suggestions-explorer` | `search-suggestions-explorer` |
| `keyword-research-suite` | seo-tools | W1 | `/api/v1/seo-tools/keyword-research-suite` | `keyword-research-suite` |
| `site-audit-suite` | seo-tools | W1 | `/api/v1/seo-tools/site-audit-suite` | `site-audit-suite` |
| `meta-tags-audit` | seo-tools | W1 | `/api/v1/seo-tools/meta-tags-audit` | `meta-tags-audit` |
| `headings-audit` | seo-tools | W1 | `/api/v1/seo-tools/headings-audit` | `headings-audit` |
| `image-seo-audit` | seo-tools | W1 | `/api/v1/seo-tools/image-seo-audit` | `image-seo-audit` |
| `performance-audit-suite` | seo-tools | W1 | `/api/v1/seo-tools/performance-audit-suite` | `performance-audit-suite` |
| `link-health-monitor` | seo-tools | W1 | `/api/v1/seo-tools/link-health-monitor` | `link-health-monitor` |
| `sitemap-suite` | seo-tools | W1 | `/api/v1/seo-tools/sitemap-suite` | `sitemap-suite` |
| `domain-intelligence-suite` | seo-tools | W1 | `/api/v1/seo-tools/domain-intelligence-suite` | `domain-intelligence-suite` |
| `tech-stack-detector-suite` | seo-tools | W1 | `/api/v1/seo-tools/tech-stack-detector` | `tech-stack-detector` |
| `qr-code-studio` | developer-tools | W1 | `/api/v1/developer-tools/qr-code-studio` | `qr-code-studio` |
| `pdf-conversion-suite` | developer-tools | W1 | `/api/v1/developer-tools/pdf-conversion-suite` | `pdf-conversion-suite` |

## build-after-foundation

| Family | Category | Wave | Endpoint | ToolNexus Slug |
| --- | --- | --- | --- | --- |
| `seo-content-optimizer` | seo-tools | W2 | `/api/v1/seo-tools/seo-content-optimizer` | `seo-content-optimizer` |
| `rank-tracker-suite` | seo-tools | W2 | `/api/v1/seo-tools/rank-tracker-suite` | `rank-tracker-suite` |
| `authority-metrics-suite` | seo-tools | W2 | `/api/v1/seo-tools/authority-metrics-suite` | `authority-metrics-suite` |
| `accessibility-audit-suite` | seo-tools | W2 | `/api/v1/seo-tools/accessibility-audit-suite` | `accessibility-audit-suite` |
| `serp-search-intelligence` | seo-tools | W2 | `/api/v1/seo-tools/serp-search-intelligence` | `serp-search-intelligence` |
| `google-indexing-suite` | seo-tools | W2 | `/api/v1/seo-tools/google-indexing-suite` | `google-indexing-suite` |
| `maps-intelligence-suite` | market-intelligence | W2 | `/api/v1/market-intelligence/maps-intelligence-suite` | `maps-intelligence-suite` |
| `jobs-intelligence-suite` | market-intelligence | W2 | `/api/v1/market-intelligence/jobs-intelligence-suite` | `jobs-intelligence-suite` |
| `company-enrichment-suite` | market-intelligence | W2 | `/api/v1/market-intelligence/company-enrichment-suite` | `company-enrichment-suite` |
| `image-optimization-suite` | developer-tools | W2 | `/api/v1/developer-tools/image-optimization-suite` | `image-optimization-suite` |
| `text-analysis-suite` | developer-tools | W2 | `/api/v1/developer-tools/text-analysis-suite` | `text-analysis-suite` |
| `tech-debt-analysis` | developer-tools | W2 | `/api/v1/developer-tools/tech-debt-analysis` | `tech-debt-analysis` |

## build-later

| Family | Category | Wave | Endpoint | ToolNexus Slug |
| --- | --- | --- | --- | --- |
| `linkedin-people-posts-intelligence` | market-intelligence | W3 | `/api/v1/market-intelligence/linkedin-people-posts-intelligence` | `linkedin-people-posts-intelligence` |
| `travel-rental-intelligence` | market-intelligence | W3 | `/api/v1/market-intelligence/travel-rental-intelligence` | `travel-rental-intelligence` |
| `market-data-prices-suite` | public-connectors | W3 | `/api/v1/public-connectors/market-data-prices` | `market-data-prices` |
| `analytics-mcp-suite` | market-intelligence | W3 | `/api/v1/market-intelligence/analytics-mcp-suite` | `analytics-mcp-suite` |
| `speech-suite` | developer-tools | W3 | `/api/v1/developer-tools/speech-suite` | `speech-suite` |
| `discord-web-publisher-suite` | content-tools | W3 | `/api/v1/content-tools/discord-web-publisher` | `discord-web-publisher` |
| `website-traffic-intelligence-suite` | market-intelligence | W3 | `/api/v1/market-intelligence/website-traffic-intelligence` | `website-traffic-intelligence` |
| `website-security-suite` | seo-tools | W3 | `/api/v1/seo-tools/website-security-audit` | `website-security-audit` |
| `youtube-channel-intelligence` | market-intelligence | W3 | `/api/v1/market-intelligence/youtube-channel-intelligence` | `youtube-channel-intelligence` |
| `app-store-market-intelligence` | market-intelligence | W3 | `/api/v1/market-intelligence/app-store-market-intelligence` | `app-store-market-intelligence` |

## template-only

| Family | Category | Wave | Endpoint | ToolNexus Slug |
| --- | --- | --- | --- | --- |
| `marketplace-review-intelligence` | market-intelligence | W3 | `/api/v1/market-intelligence/marketplace-review-intelligence` | `marketplace-review-intelligence` |
| `public-knowledge-base-connector` | public-connectors | W3 | `/api/v1/public-connectors/knowledge-base-connector` | `knowledge-base-connector` |
| `generic-public-connector-template` | public-connectors | W4 | `/api/v1/public-connectors/{provider-slug}` | `public-connector-template` |

## build-selectively

| Family | Category | Wave | Endpoint | ToolNexus Slug |
| --- | --- | --- | --- | --- |
| `social-public-data-suite` | public-connectors | W4 | `/api/v1/public-connectors/social-public-data-suite` | `social-public-data-suite` |
| `utility-misc-suite` | developer-tools | W4 | `/api/v1/developer-tools/utility-misc-suite` | `utility-misc-suite` |

## do-not-add

| Family | Category | Wave | Endpoint | ToolNexus Slug |
| --- | --- | --- | --- | --- |
| `website-traffic-generator-risky` | risk-restricted | reject | `do-not-add` | `not-applicable` |

## Source of Truth

- Canonical family details: [2026-03-26-api-family-implementation-plan.csv](/mnt/c/docker/DataLensAPI/DataLensAPI/docs/reports/2026-03-26-api-family-implementation-plan.csv)
- Forensic reasoning: [2026-03-26-api-forensic-implementation-plan.md](/mnt/c/docker/DataLensAPI/DataLensAPI/docs/reports/2026-03-26-api-forensic-implementation-plan.md)
- Delivery sequence: [EXECUTION_PLAN.md](/mnt/c/docker/DataLensAPI/DataLensAPI/docs/EXECUTION_PLAN.md)
