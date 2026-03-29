# Route Allowlist (Canonical Source of Truth)

Date: 2026-03-29

This document is the canonical allowlist for API route existence. A route exists **only** when a `route.ts` file exists under `apps/api-gateway/app/api/v1/**`.

- Total routes: **154**
- Categories: **jobs**, **seo-tools**

## Route Tree

### jobs (2)

- `/api/v1/jobs/[jobId]`
- `/api/v1/jobs/[jobId]/artifacts/[artifactId]`

### seo-tools (152)

- `/api/v1/seo-tools/amazon-keywords-discovery-tool`
- `/api/v1/seo-tools/api-gw-lite`
- `/api/v1/seo-tools/apideck`
- `/api/v1/seo-tools/app-store-keywords-discovery-tool`
- `/api/v1/seo-tools/app-store-search-suggestions`
- `/api/v1/seo-tools/appodeal-benchmark`
- `/api/v1/seo-tools/appsumo`
- `/api/v1/seo-tools/arcgis-geocode`
- `/api/v1/seo-tools/author-finder`
- `/api/v1/seo-tools/axe-accessibility-tester`
- `/api/v1/seo-tools/axe-core-accessibility-checker-actor`
- `/api/v1/seo-tools/barcode`
- `/api/v1/seo-tools/bing-keywords-discovery-tool`
- `/api/v1/seo-tools/bing-microsoft-translator`
- `/api/v1/seo-tools/bluesky`
- `/api/v1/seo-tools/broken-link-checker`
- `/api/v1/seo-tools/broken-link-checker-ensure-your-websites-integrity`
- `/api/v1/seo-tools/built-with-updated-current-technologies`
- `/api/v1/seo-tools/builtfirst`
- `/api/v1/seo-tools/builtwith-bulk-urls`
- `/api/v1/seo-tools/builtwith-technology-looker`
- `/api/v1/seo-tools/bulk-bbb`
- `/api/v1/seo-tools/business-websites-ranker`
- `/api/v1/seo-tools/candor`
- `/api/v1/seo-tools/canny`
- `/api/v1/seo-tools/capterra`
- `/api/v1/seo-tools/car-hire-rental`
- `/api/v1/seo-tools/car-hire-rental-bulk`
- `/api/v1/seo-tools/cb-insights`
- `/api/v1/seo-tools/chartmetric`
- `/api/v1/seo-tools/check-available-domain-names`
- `/api/v1/seo-tools/clearbit-combined`
- `/api/v1/seo-tools/clearbit-company`
- `/api/v1/seo-tools/clearbit-person`
- `/api/v1/seo-tools/cms-checker`
- `/api/v1/seo-tools/cms-checker-bulk`
- `/api/v1/seo-tools/cols-app`
- `/api/v1/seo-tools/community`
- `/api/v1/seo-tools/company-domain`
- `/api/v1/seo-tools/compasscom`
- `/api/v1/seo-tools/competitor-based-keyword-recommendations-for-on-page-seo`
- `/api/v1/seo-tools/crisp`
- `/api/v1/seo-tools/data-gov-india-actor`
- `/api/v1/seo-tools/dns-lookup-forward-and-reverse-a-mx-txt-dmarc-ptr`
- `/api/v1/seo-tools/domain-availability-checker`
- `/api/v1/seo-tools/domain-availability-expiry-whois-dns-ip-asn-70-tld`
- `/api/v1/seo-tools/domain-checker`
- `/api/v1/seo-tools/domain-inspector`
- `/api/v1/seo-tools/domain-intelligence-suite`
- `/api/v1/seo-tools/ebay-keywords-discovery-tool`
- `/api/v1/seo-tools/ebay-smart-shopper`
- `/api/v1/seo-tools/etsy-product-description`
- `/api/v1/seo-tools/flippa`
- `/api/v1/seo-tools/front-knowledge-base`
- `/api/v1/seo-tools/funnel-sniper`
- `/api/v1/seo-tools/ga4-mcp`
- `/api/v1/seo-tools/gainsight-ideas`
- `/api/v1/seo-tools/google-autocomplete-apify`
- `/api/v1/seo-tools/google-play-keywords-discovery-tool`
- `/api/v1/seo-tools/markdown-table-generator`
- `/api/v1/seo-tools/mastodon`
- `/api/v1/seo-tools/mastodon-bulk`
- `/api/v1/seo-tools/media-set`
- `/api/v1/seo-tools/movie-news`
- `/api/v1/seo-tools/moz-da-pa-spam-checker`
- `/api/v1/seo-tools/myanimelist`
- `/api/v1/seo-tools/network-security-scanner`
- `/api/v1/seo-tools/new-web-traffic-generator-youtube-vimeo-twitch`
- `/api/v1/seo-tools/open-graph-image-generator`
- `/api/v1/seo-tools/openpagerank-bulk-checker`
- `/api/v1/seo-tools/opentable`
- `/api/v1/seo-tools/organic-visit-simulator-x`
- `/api/v1/seo-tools/pagespeed-insights-checker`
- `/api/v1/seo-tools/partner-fleet`
- `/api/v1/seo-tools/partnerbase`
- `/api/v1/seo-tools/partnerpage`
- `/api/v1/seo-tools/plagiarism-checker`
- `/api/v1/seo-tools/pricing-page-analyzer`
- `/api/v1/seo-tools/pro-seo-audit-tool-get-your-website-data-for-search-engines`
- `/api/v1/seo-tools/profanity-checker`
- `/api/v1/seo-tools/readability-analyzer`
- `/api/v1/seo-tools/reddit`
- `/api/v1/seo-tools/rentcast`
- `/api/v1/seo-tools/reverse-dictionary-api`
- `/api/v1/seo-tools/rivalflowai`
- `/api/v1/seo-tools/search-keyword-research`
- `/api/v1/seo-tools/search-suggestions-explorer`
- `/api/v1/seo-tools/seo-audit-tool`
- `/api/v1/seo-tools/seo-h1-h6-headings-checker`
- `/api/v1/seo-tools/seo-report-generator`
- `/api/v1/seo-tools/seo-site-checkup`
- `/api/v1/seo-tools/seobility-ranking-seo`
- `/api/v1/seo-tools/serp-meta-title-generator`
- `/api/v1/seo-tools/shopify-product-search`
- `/api/v1/seo-tools/showtimes`
- `/api/v1/seo-tools/similar-app-store-applications-finder`
- `/api/v1/seo-tools/similarweb`
- `/api/v1/seo-tools/simple-bbb`
- `/api/v1/seo-tools/site-audit-suite`
- `/api/v1/seo-tools/sitemap-detector`
- `/api/v1/seo-tools/skyscanner-cars`
- `/api/v1/seo-tools/skyscanner-hotels`
- `/api/v1/seo-tools/smart-website-traffic`
- `/api/v1/seo-tools/snapify-capture-screenshot-save-pdf`
- `/api/v1/seo-tools/social-media-hashtag-generator`
- `/api/v1/seo-tools/software-advice`
- `/api/v1/seo-tools/spell-checker`
- `/api/v1/seo-tools/spotify`
- `/api/v1/seo-tools/spotify-plus`
- `/api/v1/seo-tools/spyfu`
- `/api/v1/seo-tools/spyfu-bulk-urls`
- `/api/v1/seo-tools/stackshare`
- `/api/v1/seo-tools/subdomain-finder-reverse-ip`
- `/api/v1/seo-tools/the-org`
- `/api/v1/seo-tools/the-seo-content-optimizer`
- `/api/v1/seo-tools/top-1000-websites-worldwide-country-level`
- `/api/v1/seo-tools/topic-trend-aggregator`
- `/api/v1/seo-tools/traffic-booster`
- `/api/v1/seo-tools/traffic-generator-youtube-web-etsy-behance-and-many-more`
- `/api/v1/seo-tools/trayvmy-actor`
- `/api/v1/seo-tools/trending-news`
- `/api/v1/seo-tools/tripadvisor-cruises`
- `/api/v1/seo-tools/tripadvisor-hotels`
- `/api/v1/seo-tools/trustpilot-plus`
- `/api/v1/seo-tools/tumblr-availability-checker`
- `/api/v1/seo-tools/url-mapper`
- `/api/v1/seo-tools/url-shortener`
- `/api/v1/seo-tools/uservoice`
- `/api/v1/seo-tools/vrbo`
- `/api/v1/seo-tools/w3c-html-reporter`
- `/api/v1/seo-tools/web-design-grader`
- `/api/v1/seo-tools/web-traffic-boots`
- `/api/v1/seo-tools/web-traffic-spike-simulator-x`
- `/api/v1/seo-tools/website-broken-links-redirects-checker`
- `/api/v1/seo-tools/website-links-graph-generator`
- `/api/v1/seo-tools/website-speed-checker`
- `/api/v1/seo-tools/website-traffic-generator-pro`
- `/api/v1/seo-tools/website-traffic-machine`
- `/api/v1/seo-tools/websites-traffic-generator`
- `/api/v1/seo-tools/what-site`
- `/api/v1/seo-tools/whatruns`
- `/api/v1/seo-tools/woorank`
- `/api/v1/seo-tools/x-twitter`
- `/api/v1/seo-tools/youtube-keywords-discovery-tool`
- `/api/v1/seo-tools/youtube-music-autocomplete`
- `/api/v1/seo-tools/youtube-rank-checker`
- `/api/v1/seo-tools/youtube-region-restriction-checker`
- `/api/v1/seo-tools/youtube-suggester`
- `/api/v1/seo-tools/youtube-view-generator`
- `/api/v1/seo-tools/youtube-view-generator-124-test-events-124-0001`
- `/api/v1/seo-tools/zapier`
- `/api/v1/seo-tools/zoho-help-center`

## Verification Rule

If a route appears in planning docs but is not listed here, it is considered **not implemented / removed** in the current branch.

## Public launch honesty recommendations (2026-03-29)

| Route | Forensic category | Public launch recommendation |
| --- | --- | --- |
| `/api/v1/seo-tools/business-websites-ranker` | `html-scraper` | Keep public as **lite evidence**; it discovers likely business websites from public search results and applies lightweight website-quality scoring, but it is not an authoritative Google Places feed. |
| `/api/v1/seo-tools/cms-checker` | `html-scraper` | Keep public as **lite evidence**; it now returns lightweight CMS and site-stack fingerprints from public HTML, but it is still heuristic and does not yet model competitors. |
| `/api/v1/seo-tools/cms-checker-bulk` | `html-scraper` | Keep public as **lite evidence** with tight URL caps; it applies the same lightweight CMS and site-stack fingerprints across multiple supplied URLs. |
| `/api/v1/seo-tools/showtimes` | `shallow-local-utility` | Keep public only as a **lite helper**; it emits a normalized search URL and does not scrape live showtimes. |
| `/api/v1/seo-tools/shopify-product-search` | `public-api-wrapper` | Keep public as **lite evidence** when `storeUrl` is supplied; it uses public Shopify storefront endpoints and falls back to a generic helper URL when `storeUrl` is omitted. |
| `/api/v1/seo-tools/similarweb` | `link-builder` | Keep internal/beta only until real metrics extraction exists. |
| `/api/v1/seo-tools/spotify` | `link-builder` | Keep public only as a **lite helper** (query URL builder). |
| `/api/v1/seo-tools/top-1000-websites-worldwide-country-level` | `public-api-wrapper` | Keep public as a **global popularity snapshot**; it uses the public Tranco latest-list feed and treats the legacy `country` input as compatibility-only. |
| `/api/v1/seo-tools/trustpilot-plus` | `html-scraper` | Keep public as **lite evidence** for resolvable identifiers; it extracts public aggregate review-page evidence but still does not paginate individual reviews or compute sentiment. |
| `/api/v1/seo-tools/x-twitter` | `link-builder` | Keep public only as a **profile-lite helper**; it resolves normalized profile targets but does not scrape tweets, generic search results, or engagement data. |
| `/api/v1/seo-tools/what-site` | `html-scraper` | Keep public as **lite evidence**; it now returns a lightweight site profile with final URL, metadata, heading, link, and content signals for each supplied URL. |
| `/api/v1/seo-tools/whatruns` | `html-scraper` | Keep public as **lite evidence**; it now returns lightweight technology fingerprints across CMS, frontend, ecommerce, analytics, and infrastructure categories from public HTML. |
| `/api/v1/seo-tools/youtube-region-restriction-checker` | `html-scraper` | Keep public as a **lite evidence scrape**; it parses watch-page availability data but does not independently test playback from each country. |
| `/api/v1/seo-tools/openpagerank-bulk-checker` | `api-key-stub` | Keep internal-only as a provider template by default. Reconsider only if a real OpenPageRank integration is explicitly approved later. |
| `/api/v1/seo-tools/rentcast` | `api-key-stub` | Keep internal-only as a provider template by default. Reconsider only if a real RentCast integration is explicitly approved later. |
| `/api/v1/seo-tools/snapify-capture-screenshot-save-pdf` | `queued-browser` | Keep out of the **free-tier** profile, but allow as a **credentialed preview** outside free-tier mode; it now renders real screenshot/PDF artifacts in a browser worker and uses authenticated-only status/artifact reads with a 6-hour job TTL and 2-hour artifact retention window. |
| `/api/v1/seo-tools/youtube-rank-checker` | `queued-simulated` | Keep out of the **free-tier** profile, but allow as a **credentialed preview** outside free-tier mode; it now uses multi-strategy YouTube search evidence parsing with provenance and authenticated-only status/artifact reads with a 12-hour job TTL and 6-hour artifact retention window. |
| `/api/v1/seo-tools/trayvmy-actor` | `shallow-local-utility` | Keep internal-only and deprecated; this path exists only as a compatibility stub and is not part of the public product story. |

Travel-helper routes such as `/api/v1/seo-tools/car-hire-rental`, `/api/v1/seo-tools/car-hire-rental-bulk`, `/api/v1/seo-tools/skyscanner-cars`, `/api/v1/seo-tools/skyscanner-hotels`, `/api/v1/seo-tools/tripadvisor-cruises`, `/api/v1/seo-tools/tripadvisor-hotels`, and `/api/v1/seo-tools/vrbo` now share one helper family and should be described only as normalized search helpers, not live inventory scrapers.

Challenge-gated helper routes such as `/api/v1/seo-tools/software-advice`, `/api/v1/seo-tools/spotify-plus`, `/api/v1/seo-tools/spyfu`, `/api/v1/seo-tools/spyfu-bulk-urls`, `/api/v1/seo-tools/stackshare`, and `/api/v1/seo-tools/the-org` should remain helper or internal/beta only unless a real provider-backed path is added.

## Rejected From Public Catalog

The following live routes exist in code but are explicitly rejected from the public catalog because they simulate traffic, inflate views, or otherwise fit the fake-engagement/abuse-prone class.

| Route | Class | Recommendation |
| --- | --- | --- |
| `/api/v1/seo-tools/new-web-traffic-generator-youtube-vimeo-twitch` | `traffic-simulation` | Keep disabled and out of the public catalog. |
| `/api/v1/seo-tools/organic-visit-simulator-x` | `traffic-simulation` | Keep disabled and out of the public catalog. |
| `/api/v1/seo-tools/smart-website-traffic` | `traffic-simulation` | Keep disabled and out of the public catalog. |
| `/api/v1/seo-tools/traffic-booster` | `traffic-simulation` | Keep disabled and out of the public catalog. |
| `/api/v1/seo-tools/traffic-generator-youtube-web-etsy-behance-and-many-more` | `traffic-simulation` | Keep disabled and out of the public catalog. |
| `/api/v1/seo-tools/web-traffic-boots` | `traffic-simulation` | Keep disabled and out of the public catalog. |
| `/api/v1/seo-tools/web-traffic-spike-simulator-x` | `traffic-simulation` | Keep disabled and out of the public catalog. |
| `/api/v1/seo-tools/website-traffic-generator-pro` | `traffic-simulation` | Keep disabled and out of the public catalog. |
| `/api/v1/seo-tools/website-traffic-machine` | `traffic-simulation` | Keep disabled and out of the public catalog. |
| `/api/v1/seo-tools/websites-traffic-generator` | `traffic-simulation` | Keep disabled and out of the public catalog. |
| `/api/v1/seo-tools/youtube-view-generator` | `fake-engagement` | Keep disabled and out of the public catalog. |
| `/api/v1/seo-tools/youtube-view-generator-124-test-events-124-0001` | `fake-engagement` | Keep disabled and out of the public catalog. |
