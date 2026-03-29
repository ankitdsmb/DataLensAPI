# Route Honesty Pass Report

- Date: 2026-03-28
- Scope: weak-route over-promise cleanup for prioritized SEO tools.
- Mission outcome: prioritized weak routes are now either explicitly **lite/helper/template** in response contracts, strengthened with honest public evidence, or **deferred** for public launch.
- Follow-up governance outcome: rejected traffic and fake-engagement routes now return explicit `rejected_for_public_catalog` contracts instead of generic queued/test placeholders.

## Forensic category definitions used

- `link-builder`: validates input and builds canonical external links only.
- `public-api-wrapper`: calls a public JSON endpoint and returns lightly normalized first-party evidence.
- `api-key-stub`: contract is a provider template that requires credentials not wired in the route.
- `queued-placeholder`: route accepts payload but does not execute the underlying heavy workflow.
- `queued-simulated`: route submits into the real job runtime, but current worker output is synthetic, deterministic, or projection-based rather than provider-grade execution.
- `shallow network-wrapper`: route proxies a thin upstream call without meaningful product logic.
- `shallow local-utility`: route only performs minimal local transformation/validation.

## Strengthened vs relabeled vs deferred

| Route | Forensic category | Action taken | Public launch recommendation | Notes |
| --- | --- | --- | --- | --- |
| `/api/v1/seo-tools/business-websites-ranker` | `html-scraper` | Strengthened with public evidence | Public lite/evidence | Discovers public websites from DuckDuckGo HTML search results and applies lightweight website-quality scoring; still heuristic, but no longer just a seed URL builder. |
| `/api/v1/seo-tools/barcode` | `public-api-wrapper` | Strengthened with public evidence | Public lite/evidence | Calls the public OpenFoodFacts product API and falls back to the public product page when the API is rate-limited, returning real barcode product evidence instead of only inferring format from string length. |
| `/api/v1/seo-tools/cms-checker` | `html-scraper` | Strengthened with public evidence | Public lite/evidence | Fetches public HTML and applies lightweight technology fingerprinting to identify likely CMS and related site-stack signals instead of only shallow generator hints. |
| `/api/v1/seo-tools/cms-checker-bulk` | `html-scraper` | Strengthened with public evidence | Public lite/evidence | Fetches public HTML in bulk and applies the same lightweight technology fingerprinting across multiple supplied URLs. |
| `/api/v1/seo-tools/open-graph-image-generator` | `local-utility` | Strengthened with deterministic local evidence | Public lite/evidence | Generates first-party SVG open graph artwork with theme presets, wrapped text, deterministic layout, and previewable data URIs instead of returning a `dummyimage.com` URL. |
| `/api/v1/seo-tools/plagiarism-checker` | `local-utility` | Strengthened with deterministic local evidence | Public lite/evidence | Runs deterministic local n-gram similarity analysis with repeated-phrase detection, pairwise overlap scoring, and shared-phrase excerpts instead of only returning an internal duplicate-word ratio. |
| `/api/v1/seo-tools/serp-meta-title-generator` | `local-utility` | Strengthened with deterministic local evidence | Public lite/evidence | Generates intent-aware SEO title variants with brand placement, pixel-width heuristics, scored recommendations, and title-length evidence instead of returning a tiny fixed template list. |
| `/api/v1/seo-tools/topic-trend-aggregator` | `local-utility` | Strengthened with deterministic local evidence | Public lite/evidence | Clusters supplied topic phrases into overlapping themes, scores momentum from mention/modifier signals, and returns representative trend groups instead of only ranking topics by string length. |
| `/api/v1/seo-tools/trending-news` | `public-api-wrapper` | Strengthened with public evidence | Public lite/evidence | Uses the public Google News RSS search feed to return live article metadata, source names, publication times, and feed-level evidence instead of only emitting a search URL. |
| `/api/v1/seo-tools/similar-app-store-applications-finder` | `html-scraper` | Strengthened with public evidence | Public lite/evidence | Fetches the public App Store app page and parses the visible “You Might Also Like” shelf plus source-app metadata instead of only returning a queued app URL. |
| `/api/v1/seo-tools/opentable` | `html-scraper` | Strengthened with public evidence | Public lite/evidence | Fetches the public OpenTable search page and parses embedded restaurant search-state data instead of only returning a raw search URL. |
| `/api/v1/seo-tools/zapier` | `html-scraper` | Strengthened with public evidence | Public lite/evidence | Fetches the public Zapier app integrations page for a resolvable app slug and extracts app metadata plus visible integration-card evidence instead of only returning a search helper URL. |
| `/api/v1/seo-tools/domain-availability-expiry-whois-dns-ip-asn-70-tld` | `network-wrapper` | Strengthened with live network evidence | Public lite/evidence | Returns live DNS availability, A-record summaries, DNS matrix results, and HTTPS reachability evidence instead of only a single A-record payload with null WHOIS/IP placeholders. |
| `/api/v1/seo-tools/markdown-table-generator` | `local-utility` | Strengthened with deterministic local evidence | Public lite/evidence | Generates markdown tables from explicit rows or parsed CSV/TSV-style input, with alignment control, markdown escaping, and ragged-row normalization instead of only requiring pre-structured headers and rows. |
| `/api/v1/seo-tools/social-media-hashtag-generator` | `local-utility` | Strengthened with deterministic local evidence | Public lite/evidence | Generates platform-aware hashtag suggestions with keyword normalization, grouping, ranking, duplicate control, and cross-keyword combinations instead of only emitting raw joined-token tags. |
| `/api/v1/seo-tools/profanity-checker` | `local-utility` | Strengthened with deterministic local evidence | Public lite/evidence | Runs a deterministic local moderation engine with whole-word matching, light obfuscation normalization, position-aware masking, severity, and optional custom terms instead of a tiny placeholder blocklist. |
| `/api/v1/seo-tools/shopify-product-search` | `public-api-wrapper` | Strengthened with public evidence | Public lite/evidence | Uses public Shopify storefront predictive-search or products-feed endpoints to return normalized product evidence for a supplied `storeUrl`; without `storeUrl` it falls back honestly to a helper URL. |
| `/api/v1/seo-tools/spell-checker` | `public-api-wrapper` | Strengthened with public evidence | Public lite/evidence | Calls the public LanguageTool endpoint and returns real spelling/grammar matches with suggested replacements for capped text input instead of local suspect-word heuristics. |
| `/api/v1/seo-tools/ga4-mcp` | `html-scraper` | Strengthened with public evidence | Public lite/evidence | Fetches public HTML and inspects GA4 measurement ids, gtag/GTM loaders, and related analytics markup signals for supplied URLs instead of only returning queued/pending placeholder responses. |
| `/api/v1/seo-tools/what-site` | `html-scraper` | Strengthened with public evidence | Public lite/evidence | Fetches public HTML and returns a lightweight site profile with final URL, metadata, heading, link, and content signals instead of only a title/description pair. |
| `/api/v1/seo-tools/whatruns` | `html-scraper` | Strengthened with public evidence | Public lite/evidence | Fetches public HTML and returns lightweight technology fingerprints across CMS, frontend, ecommerce, analytics, and infrastructure categories instead of only shallow generator hints. |
| `/api/v1/seo-tools/woorank` | `html-scraper` | Strengthened with first-party audit evidence | Public lite/evidence | Runs the shared first-party lightweight SEO audit over supplied URLs and returns page-level findings plus a summarized site score instead of only returning queued/pending placeholder responses. |
| `/api/v1/seo-tools/seobility-ranking-seo` | `html-scraper` | Strengthened with first-party audit evidence | Public lite/evidence | Runs the shared first-party homepage audit plus basic live domain checks for the supplied domain and returns page-level findings with a summarized site score instead of only returning queued/pending placeholder responses. |
| `/api/v1/seo-tools/moz-da-pa-spam-checker` | `html-scraper` | Strengthened with proxy evidence | Public lite/evidence | Runs first-party homepage audit plus live DNS/HTTP checks and returns heuristic proxy scores for authority and spam risk instead of null Moz fields. |
| `/api/v1/seo-tools/similarweb` | `link-builder` | Relabeled honestly | Internal or beta only | Explicitly labeled report URL helper, no analytics scraping claims. |
| `/api/v1/seo-tools/spotify` | `link-builder` | Relabeled honestly | Public lite/helper | Explicitly labeled Spotify query URL helper only. |
| `/api/v1/seo-tools/trustpilot-plus` | `html-scraper` | Strengthened with public evidence | Public lite/evidence | Fetches the public Trustpilot review page for resolvable identifiers and extracts aggregate rating plus review-count evidence; unresolved inputs still fall back to a helper contract. |
| `/api/v1/seo-tools/bulk-bbb` | `html-scraper` | Strengthened with public evidence | Public lite/evidence | Fetches public BBB search pages in bulk, parses visible business matches for each input company, and enriches the best matched BBB profile with rating evidence and complaint signals. |
| `/api/v1/seo-tools/simple-bbb` | `html-scraper` | Strengthened with public evidence | Public lite/evidence | Fetches the public BBB search page, parses visible business matches, and enriches the best match with BBB profile metadata, rating evidence, and complaint signals. |
| `/api/v1/seo-tools/youtube-region-restriction-checker` | `html-scraper` | Strengthened with public evidence | Public lite/evidence | Fetches the public watch page and parses `playabilityStatus`, `playableInEmbed`, and `availableCountries`; it still does not independently simulate playback from each country. |
| `/api/v1/seo-tools/openpagerank-bulk-checker` | `api-key-stub` | Relabeled honestly | Internal-only provider template by default | Explicit internal provider-template contract with `provider_credentials_required` results and `not_executed` provider state; reconsider only if real provider access is explicitly approved later. |
| `/api/v1/seo-tools/rentcast` | `api-key-stub` | Relabeled honestly | Internal-only provider template by default | Explicit internal provider-template contract with normalized lookup helper and `not_executed` provider state; reconsider only if real provider access is explicitly approved later. |
| `/api/v1/seo-tools/snapify-capture-screenshot-save-pdf` | `queued-browser` | Strengthened, but still deferred | Deferred from public launch | Real async job contract now renders screenshot/PDF artifacts in an internal browser worker, with live HTML evidence fallback when browser execution is unavailable. |
| `/api/v1/seo-tools/youtube-rank-checker` | `queued-simulated` | Strengthened, but still deferred | Deferred from public launch | Real async job contract now uses multi-strategy YouTube search evidence parsing with provenance, retries across parsing strategies, and deterministic fallback when live evidence still cannot be collected. |
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
  - verifies `business-websites-ranker` returns live website discovery plus scoring evidence
  - verifies `barcode` returns live product evidence from the public OpenFoodFacts API or product-page fallback for a known UPC/EAN
  - verifies `cms-checker` returns live technology fingerprint evidence for a supplied public site
  - verifies `open-graph-image-generator` returns first-party SVG open graph artwork with a previewable data URI and deterministic theme/layout metadata
  - verifies `plagiarism-checker` returns deterministic local n-gram overlap analysis with pairwise similarity scoring, repeated-phrase evidence, and shared-phrase excerpts
  - verifies `serp-meta-title-generator` returns deterministic intent-aware SEO title variants with brand placement, scoring, and pixel/length evidence
  - verifies `topic-trend-aggregator` returns deterministic topic clusters with representative phrases, shared tokens, and momentum signals instead of raw string-length scoring
  - verifies `trending-news` returns live Google News RSS article metadata, source names, publication times, and feed evidence for a supplied keyword
  - verifies `similar-app-store-applications-finder` returns live App Store shelf evidence and source-app metadata for a supplied app id
  - verifies `opentable` returns live restaurant search-state evidence with profile links, cuisine, neighborhood, ratings, and reservation signals
  - verifies `zapier` returns live public app-integrations page evidence with app metadata and visible integration-card extraction
  - verifies `domain-availability-expiry-whois-dns-ip-asn-70-tld` returns live DNS availability, A-record summaries, DNS matrix evidence, and HTTPS reachability
  - verifies `markdown-table-generator` returns deterministic markdown table output with parsed delimited input, alignment control, escaping, and ragged-row normalization under the route’s API-key launch posture
  - verifies `social-media-hashtag-generator` returns deterministic platform-aware hashtag suggestions with grouping, ranking, duplicate control, and cross-keyword combinations under the route’s API-key launch posture
  - verifies `profanity-checker` returns deterministic moderation matches, masking, severity, and custom-word handling under the route’s API-key launch posture
  - verifies `shopify-product-search` returns live storefront product evidence from a supplied public Shopify store
  - verifies `spell-checker` returns live spelling and grammar match evidence from the public LanguageTool endpoint
  - verifies `ga4-mcp` returns live GA4 tag evidence from supplied public HTML, including measurement ids plus gtag/GTM detection
  - verifies `what-site` returns live site-profile evidence from a supplied public URL
  - verifies `whatruns` returns live technology fingerprint evidence across multiple categories for a supplied public site
  - verifies `woorank` returns first-party light SEO audit evidence with page-level findings and a summarized site score
  - verifies `seobility-ranking-seo` returns first-party homepage audit evidence plus live domain-check signals for a supplied domain
  - verifies `moz-da-pa-spam-checker` returns proxy authority and spam-risk evidence with live DNS/HTTP signals for a supplied domain
  - verifies helper/link-builder contracts
  - verifies `youtube-region-restriction-checker` returns watch-page availability evidence
  - verifies `trustpilot-plus` returns live review-page aggregate evidence
  - verifies `bulk-bbb` returns live BBB bulk search/profile evidence
  - verifies `simple-bbb` returns live BBB search/profile evidence
  - verifies `openpagerank-bulk-checker` and `rentcast` return the expected internal provider-template contracts
