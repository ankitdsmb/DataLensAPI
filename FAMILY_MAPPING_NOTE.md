# Family Mapping Note (Compatibility Wrappers)

This note tracks high-duplication SEO routes that now delegate to canonical family services in `packages/scraping-core/src/families/*`.

## site-audit family

Shared module: `packages/scraping-core/src/families/siteAudit.ts`

- `/api/v1/seo-tools/seo-audit-tool` -> `runLightSiteAudit` (compat response: `results`).
- `/api/v1/seo-tools/pro-seo-audit-tool-get-your-website-data-for-search-engines` -> `runLightSiteAudit` + `summarizeSiteAuditPages` (compat response: `pages`, `summary`).
- `/api/v1/seo-tools/site-audit-suite` -> canonical wrapper using same shared audit service (light single-page mode baseline).

## keyword-discovery family

Shared module: `packages/scraping-core/src/families/keywordDiscovery.ts`

- `/api/v1/seo-tools/google-autocomplete-apify` -> `discoverKeywordSuggestions('google', ...)`.
- `/api/v1/seo-tools/youtube-suggester` -> `discoverKeywordSuggestions('youtube', ...)`.
- `/api/v1/seo-tools/google-play-keywords-discovery-tool` -> `discoverKeywordSuggestions('google-play', ...)`.
- `/api/v1/seo-tools/youtube-keywords-discovery-tool` -> `discoverKeywordSuggestions('youtube', ...)`.
- `/api/v1/seo-tools/bing-keywords-discovery-tool` -> `discoverKeywordSuggestions('bing', ...)`.
- `/api/v1/seo-tools/amazon-keywords-discovery-tool` -> `discoverKeywordSuggestions('amazon', ...)`.
- `/api/v1/seo-tools/app-store-search-suggestions` -> `discoverKeywordSuggestions('app-store', ...)`.
- `/api/v1/seo-tools/app-store-keywords-discovery-tool` -> `discoverKeywordSuggestions('app-store', ...)`.
- `/api/v1/seo-tools/search-suggestions-explorer` -> canonical source-driven wrapper via shared keyword provider adapter.

## domain-intelligence family

Shared module: `packages/scraping-core/src/families/domainIntelligence.ts`

- `/api/v1/seo-tools/domain-checker` -> `normalizeDomain` + `lookupDomainARecord` + `toAvailability`.
- `/api/v1/seo-tools/domain-availability-checker` -> same shared domain availability path.
- `/api/v1/seo-tools/domain-inspector` -> shared DNS + shared HTTP snapshot.
- `/api/v1/seo-tools/domain-availability-expiry-whois-dns-ip-asn-70-tld` -> shared DNS availability + placeholders for non-implemented data.
- `/api/v1/seo-tools/dns-lookup-forward-and-reverse-a-mx-txt-dmarc-ptr` -> `normalizeDomainTarget` + `runDnsMatrixLookup`.
- `/api/v1/seo-tools/domain-intelligence-suite` -> canonical wrapper using shared domain-intelligence services.
