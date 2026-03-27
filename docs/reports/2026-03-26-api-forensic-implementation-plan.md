# DataLens API Forensic Implementation Plan

## What This Report Covers

- A forensic read of the current `DataLensAPI` repository.
- A normalized implementation plan for the raw API backlog you shared.
- A future-proof request/response contract recommendation.
- ToolNexus onboarding rules, limits, and integration contract based on the actual `ToolNexus` repo.

## Executive Summary

- The current repo is a strong starter scaffold, not yet a full production platform for this backlog.
- The raw backlog should **not** be implemented one ticket = one endpoint. It contains many duplicates and many thin wrappers.
- The best path is to merge the list into **canonical API families** and build a shared provider/runtime layer underneath them.
- The highest-value launch wave is the SEO and developer-tool families that are lightweight, differentiable, and ToolNexus-friendly.
- Traffic generation, fake engagement, and fake view tools should be **excluded** from the public roadmap.

## Current Repo Forensic Read

### Key Reality Check

- The docs describe a broader multi-service platform, but the actual heavy scraper service is still mostly placeholder.
- The API gateway already has a useful shared wrapper pattern, but request validation, auth, rate limiting, async jobs, and artifact storage are still missing or incomplete.
- Several existing routes are proof-of-concept implementations or placeholder delegations rather than stable product-grade APIs.

### Evidence Highlights

- Repo positioning: `README.md`, `docs/FORENSIC_ARCHITECTURE_REPORT.md`
- Shared timeout and HTTP wrapper: `packages/scraping-core/src/httpClient.ts`
- Standard response envelope: `packages/scraping-core/src/apiWrapper.ts`
- Example lightweight implementation: `apps/api-gateway/app/api/v1/seo/keyword-density/route.ts`
- Example placeholder heavy delegation: `apps/api-gateway/app/api/v1/jobs/linkedin-scraper/route.ts`
- Current heavy worker placeholder: `apps/scraper-service/index.js`

### Findings Table

| ID | Area | Severity | Current State | Recommended Fix |
| --- | --- | --- | --- | --- |
| DL-001 | Architecture reality | high | Docs describe a multi-service production-ready platform, but the codebase is one Next.js API gateway plus a placeholder scraper service. | Treat the current repo as a foundation. Build a real execution split: lightweight HTTP routes in api-gateway, heavy browser jobs in scraper-service, and async job orchestration for long-running work. |
| DL-002 | Validation | high | Routes parse raw JSON and throw generic errors. There is no strict schema validation, canonical normalization, or typed request contract enforcement. | Add request/response schemas with Zod or a shared validator package. Reject unknown fields when required and emit machine-readable error codes. |
| DL-003 | Timeout budget | high | Shared HTTP client timeout is 15000 ms while the backlog guidelines repeatedly say 10 second timeout limit. | Move timeout into per-tool policy. Default lightweight tools to 10s, allow heavy async jobs to exceed 10s only behind job orchestration. |
| DL-004 | Response envelope | high | Standard envelope is useful but minimal: success, data, metadata.timestamp, execution_time_ms, error. | Version the response contract. Add request_id, tool_version, source, warnings, pagination, and optional job object without breaking existing consumers. |
| DL-005 | Authentication and abuse controls | critical | Docs mention API keys, but the gateway code shows no auth, tenant identity, rate limiting, or abuse segmentation. | Add API key middleware, IP and key based rate limiting, per-tool concurrency limits, and anonymous/public vs authenticated/private policy flags. |
| DL-006 | Async execution | critical | Several heavy endpoints return placeholder delegated messages but no actual queue, worker, status endpoint, or artifact store exists. | Introduce Job entity, queue, worker callbacks, /jobs/{id} status endpoint, and durable result storage. |
| DL-007 | Provider abstraction | medium | Routes are direct one-off implementations with very little provider abstraction, shared fetch normalization, or reusable parser modules. | Create provider adapters for fetch, html extraction, crawl, search suggestion sources, lighthouse sources, domain intelligence, and file rendering. |
| DL-008 | Caching and storage | medium | No durable cache, no crawl snapshot store, no artifact bucket integration, and no historical result retention strategy is visible. | Add cache layer for GET-equivalent public data, object storage for generated files, and historical result persistence for tracking products. |
| DL-009 | Testing and contract verification | medium | Docs reference QA automation but the repo does not expose a visible contract-test suite for all listed endpoints. | Add route contract tests, snapshot examples, and schema conformance tests for every public endpoint. |
| DL-010 | Taxonomy and naming | medium | Current route taxonomy is mixed and the backlog includes many duplicates, overly long names, and vendor-derived raw titles. | Canonicalize into family slugs, merge duplicates, shorten names, and separate public categories: seo-tools, developer-tools, market-intelligence, public-connectors, content-tools. |
| DL-011 | ToolNexus compatibility | high | DataLens endpoints do not currently export ToolNexus-ready manifest metadata, supported actions, or execution policies. | Generate a ToolNexus import package per canonical API family: manifest row, ToolShell asset stub, executor registration, policy defaults, and public docs page. |
| DL-012 | Legal and safety governance | critical | The backlog contains high-abuse traffic generators, view generators, load simulators, and traffic manipulation tools mixed with legitimate SEO utilities. | Create an explicit reject list and a restricted review path. Keep manipulative traffic and fake-view tools out of ToolNexus public catalog. |

## Recommended Platform Model

### Architecture Split

1. `api-gateway` for lightweight public HTTP tools.
2. `scraper-service` for browser-heavy, crawl-heavy, and artifact-heavy jobs.
3. A shared provider layer for HTML fetch, crawl, SERP, lighthouse, domain intelligence, and file rendering.
4. A queue plus durable job/result storage for anything that cannot complete safely inside the ingress timeout budget.

### Mandatory Platform Additions Before Large Backlog Import

- Strict request schema validation.
- Per-tool timeout and input-size policy.
- API key auth plus anonymous/public policy flags.
- IP/key rate limiting and per-tool concurrency limits.
- Async jobs with `/jobs/{id}` style status lookup.
- Artifact storage for generated files and larger reports.
- Contract tests for every public endpoint.

## Standard API Contract Recommendation

### Request Principles

- Prefer explicit JSON objects over loose `query` strings.
- Support bulk mode from day one where it is safe.
- Keep `action` or `mode` explicit for multi-capability families.
- Normalize locale, country, language, crawl depth, and output profile fields across families.

### Response Envelope

```json
{
  "success": true,
  "data": {},
  "metadata": {
    "request_id": "req_123",
    "timestamp": "2026-03-26T00:00:00Z",
    "execution_time_ms": 842,
    "tool_version": "1.0.0",
    "source": "datalens",
    "warnings": []
  },
  "error": null,
  "job": null,
  "pagination": null
}
```

### Async Response Pattern

```json
{
  "success": true,
  "data": null,
  "metadata": {
    "request_id": "req_456",
    "timestamp": "2026-03-26T00:00:00Z",
    "execution_time_ms": 91,
    "tool_version": "1.0.0",
    "source": "datalens",
    "warnings": []
  },
  "error": null,
  "job": {
    "id": "job_abc",
    "status": "queued",
    "status_url": "/api/v1/jobs/job_abc"
  },
  "pagination": null
}
```

### Error Contract

```json
{
  "success": false,
  "data": null,
  "metadata": {
    "request_id": "req_789",
    "timestamp": "2026-03-26T00:00:00Z",
    "execution_time_ms": 12,
    "tool_version": "1.0.0",
    "source": "datalens",
    "warnings": []
  },
  "error": {
    "code": "validation_error",
    "message": "keywords is required",
    "details": {
      "field": "keywords"
    }
  },
  "job": null,
  "pagination": null
}
```

## Canonical API Families

### Wave 1: Build Now

| Family | Canonical Name | Endpoint | Tier | ToolNexus Slug | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `keyword-density-and-presence-audit` | Keyword Density & Presence Audit API | `/api/v1/seo-tools/keyword-density-audit` | gateway-light | `keyword-density-audit` | position-aware scoring; multi-page summary; explicit coverage model instead of only top-word counts |
| `search-suggestions-explorer` | Search Suggestions Explorer API | `/api/v1/seo-tools/search-suggestions-explorer` | gateway-light | `search-suggestions-explorer` | single normalized contract across engines; source metadata; source-specific enrichments via optional flags |
| `keyword-research-suite` | Keyword Research Suite API | `/api/v1/seo-tools/keyword-research-suite` | gateway-light+cache | `keyword-research-suite` | single response across multiple providers; cluster-ready output; export-friendly JSON |
| `site-audit-suite` | Site Audit Suite API | `/api/v1/seo-tools/site-audit-suite` | async-heavy | `site-audit-suite` | stable issue codes; profile-based auditing; agency-friendly JSON for downstream automation |
| `meta-tags-audit` | Meta Tags Audit API | `/api/v1/seo-tools/meta-tags-audit` | gateway-light | `meta-tags-audit` | preview-ready structured social metadata and normalized issue codes |
| `headings-audit` | Headings Audit API | `/api/v1/seo-tools/headings-audit` | gateway-light | `headings-audit` | tree output that downstream docs and editors can use directly |
| `image-seo-audit` | Image SEO Audit API | `/api/v1/seo-tools/image-seo-audit` | gateway-light+cache | `image-seo-audit` | SEO-specific image issue model instead of generic asset list |
| `performance-audit-suite` | Performance Audit Suite API | `/api/v1/seo-tools/performance-audit-suite` | async-heavy | `performance-audit-suite` | compact JSON contract plus richer artifact mode; batch-ready envelope |
| `link-health-monitor` | Link Health Monitor API | `/api/v1/seo-tools/link-health-monitor` | gateway-light+async | `link-health-monitor` | single contract for uptime and SEO link health; chain visualization fields |
| `sitemap-suite` | Sitemap Suite API | `/api/v1/seo-tools/sitemap-suite` | gateway-light+async | `sitemap-suite` | both discovery and generation under one contract |
| `domain-intelligence-suite` | Domain Intelligence Suite API | `/api/v1/seo-tools/domain-intelligence-suite` | gateway-light+cache | `domain-intelligence-suite` | one-stop domain diagnostics; clean sub-objects by data type |
| `tech-stack-detector-suite` | Tech Stack Detector API | `/api/v1/seo-tools/tech-stack-detector` | gateway-light+cache | `tech-stack-detector` | evidence-based output instead of flat technology list |
| `qr-code-studio` | QR Code Studio API | `/api/v1/developer-tools/qr-code-studio` | gateway-light | `qr-code-studio` | one contract for single and bulk; metadata-rich output |
| `pdf-conversion-suite` | PDF Conversion Suite API | `/api/v1/developer-tools/pdf-conversion-suite` | scraper-service-heavy | `pdf-conversion-suite` | single suite for markup and website capture with consistent artifact model |

### Wave 2: Build After Foundation

| Family | Canonical Name | Endpoint | Tier | Main Dependency Before Build |
| --- | --- | --- | --- | --- |
| `seo-content-optimizer` | SEO Content Optimizer API | `/api/v1/seo-tools/seo-content-optimizer` | async-heavy | requires SERP plus page extraction plus scoring engine; better as async job with artifact caching |
| `rank-tracker-suite` | Rank Tracker Suite API | `/api/v1/seo-tools/rank-tracker-suite` | async-heavy | must be async if bulk or historical; persist snapshots if productized |
| `authority-metrics-suite` | Authority Metrics Suite API | `/api/v1/seo-tools/authority-metrics-suite` | gateway-light+cache | use provider adapters and aggressive caching; avoid hard dependency on a single vendor |
| `accessibility-audit-suite` | Accessibility Audit Suite API | `/api/v1/seo-tools/accessibility-audit-suite` | scraper-service-heavy | requires browser runtime for robust evaluation; best routed to scraper-service |
| `serp-search-intelligence` | SERP Search Intelligence API | `/api/v1/seo-tools/serp-search-intelligence` | gateway-light+async | use provider-specific parsers plus shared normalized schema; bulk mode should be async |
| `google-indexing-suite` | Google Indexing Suite API | `/api/v1/seo-tools/google-indexing-suite` | gateway-light+auth | must separate credentialed actions from public checks; likely async for bulk |
| `maps-intelligence-suite` | Maps Intelligence Suite API | `/api/v1/market-intelligence/maps-intelligence-suite` | scraper-service-heavy | needs heavy browser or resilient provider adapter; make review volume async |
| `jobs-intelligence-suite` | Jobs Intelligence Suite API | `/api/v1/market-intelligence/jobs-intelligence-suite` | gateway-light+async | keep source adapters separate; bulk or deep detail mode should be async |
| `company-enrichment-suite` | Company Enrichment Suite API | `/api/v1/market-intelligence/company-enrichment-suite` | gateway-light+auth | should be auth-protected and source-provenance labeled; good fit for provider adapter pattern |
| `image-optimization-suite` | Image Optimization Suite API | `/api/v1/developer-tools/image-optimization-suite` | gateway-light+worker | can start with compression only; OG generation may need headless rendering |
| `text-analysis-suite` | Text Analysis Suite API | `/api/v1/developer-tools/text-analysis-suite` | gateway-light+auth | keep deterministic actions in gateway; third-party plagiarism mode should be auth-only |
| `tech-debt-analysis` | Tech Debt Analysis API | `/api/v1/developer-tools/tech-debt-analysis` | async-heavy | good adjacent fit for the repo; separate from SEO stack and give it its own analyzer service if needed |

### Wave 3 and Later

| Family | Canonical Name | Endpoint | Decision | Notes |
| --- | --- | --- | --- | --- |
| `linkedin-people-posts-intelligence` | LinkedIn People Posts Intelligence API | `/api/v1/market-intelligence/linkedin-people-posts-intelligence` | build-later | platform anti-bot pressure is high; keep public-only positioning |
| `travel-rental-intelligence` | Travel & Rental Intelligence API | `/api/v1/market-intelligence/travel-rental-intelligence` | build-later | many providers change aggressively and may require browser automation |
| `market-data-prices-suite` | Market Data Prices API | `/api/v1/public-connectors/market-data-prices` | build-later | financial data freshness matters; disclose latency and provider |
| `analytics-mcp-suite` | Analytics MCP Suite API | `/api/v1/market-intelligence/analytics-mcp-suite` | build-later | sensitive customer analytics data; high governance surface |
| `speech-suite` | Speech Suite API | `/api/v1/developer-tools/speech-suite` | build-later | media processing costs and file handling need strict quotas |
| `discord-web-publisher-suite` | Discord Web Publisher API | `/api/v1/content-tools/discord-web-publisher` | build-later | must not bypass Discord private access |
| `website-traffic-intelligence-suite` | Website Traffic Intelligence API | `/api/v1/market-intelligence/website-traffic-intelligence` | build-later | estimated traffic data is modelled, not ground truth |
| `website-security-suite` | Website Security Audit API | `/api/v1/seo-tools/website-security-audit` | build-later | do not include active port scanning or exploit behavior in public catalog |
| `youtube-channel-intelligence` | YouTube Channel Intelligence API | `/api/v1/market-intelligence/youtube-channel-intelligence` | build-later | watch for anti-bot rate limits and regional discrepancies |
| `app-store-market-intelligence` | App Store Market Intelligence API | `/api/v1/market-intelligence/app-store-market-intelligence` | build-later | public metadata only |
| `marketplace-review-intelligence` | Marketplace & Review Intelligence API | `/api/v1/market-intelligence/marketplace-review-intelligence` | template-only | source quality and fields vary widely |
| `public-knowledge-base-connector` | Public Knowledge Base Connector API | `/api/v1/public-connectors/knowledge-base-connector` | template-only | respect source robots and public-only boundaries |
| `social-public-data-suite` | Social Public Data Suite API | `/api/v1/public-connectors/social-public-data-suite` | build-selectively | high maintenance and low differentiation if imported naively |
| `generic-public-connector-template` | Generic Public Connector Template | `/api/v1/public-connectors/{provider-slug}` | template-only | low differentiation and high maintenance if you onboard too many providers |
| `utility-misc-suite` | Utility Misc Suite API | `/api/v1/developer-tools/utility-misc-suite` | build-selectively | low risk but low strategic leverage |

### Explicit Reject List

| Family | Reason |
| --- | --- |
| `website-traffic-generator-risky` | high abuse, trust, and platform reputation risk |

## Recommended Feature Set That Will Actually Differentiate The APIs

### Features Every Serious Family Should Have

- Canonical and strict input schema.
- Stable issue codes or metric keys.
- Bulk mode when safe.
- Provenance labels when using third-party data or estimates.
- Summary object plus page/item-level details.
- Tool version and request id in every response.
- Cacheability and async behavior defined per family.

### Features That Make a Real Product Difference

- **Profile modes** instead of separate duplicate tools: for example `site-audit-suite` can support `technical`, `content`, `links`, and `images` profiles.
- **Evidence-based output** instead of flat scores: for example tech stack detection should include confidence and evidence.
- **Normalized provider abstraction**: one schema for Google, Bing, YouTube, Amazon, App Store suggestions instead of separate incompatible endpoints.
- **Artifact mode** for heavy tools: Lighthouse, PDF, screenshots, and site audits should return both JSON and downloadable artifacts.
- **Future history hooks**: tracking tools should be ready for stored snapshots even if history is not enabled in v1.

## Priority Family Cards

### Keyword Density & Presence Audit API

- **Endpoint:** `/api/v1/seo-tools/keyword-density-audit`
- **SEO Title:** Keyword Density Audit API | Measure Keyword Frequency, Coverage and Stuffing Risk
- **SEO Description:** Analyze one or many pages for keyword density, exact-match coverage, heading placement, and keyword stuffing risk with structured SEO-ready JSON output.
- **Best Fit Tier:** `gateway-light`
- **MVP Features:** single and bulk URL mode; exact-match and stem matching; title/H1/body coverage; top terms; stuffing signal
- **What Makes It Different:** position-aware scoring; multi-page summary; explicit coverage model instead of only top-word counts
- **Future Extensions:** competitor comparison; multilingual stemming; crawl mode; content gap suggestions

**Request Example**

```json
{"urls":["https://example.com"],"keywords":["seo audit"],"includeNgrams":true,"topN":50}
```

**Response Example**

```json
{"success":true,"data":{"pages":[{"url":"...","totalWords":1200,"keywords":[{"keyword":"seo audit","count":12,"density":1.0,"inTitle":true,"inH1":false}],"stuffingRisk":"low"}],"summary":{"pageCount":1}}}
```

### Search Suggestions Explorer API

- **Endpoint:** `/api/v1/seo-tools/search-suggestions-explorer`
- **SEO Title:** Search Suggestions API | Google, YouTube, Amazon, Bing, App Store and More
- **SEO Description:** Fetch real-time autocomplete suggestions, related queries, and hidden long-tail expansions from major search and marketplace sources.
- **Best Fit Tier:** `gateway-light`
- **MVP Features:** multi-source suggestions; locale support; hidden expansion mode; deduplication; ranking score
- **What Makes It Different:** single normalized contract across engines; source metadata; source-specific enrichments via optional flags
- **Future Extensions:** trend scoring; clustering; SERP volume overlay; saved topic lists

**Request Example**

```json
{"source":"google","keyword":"keyword research","locale":"en-US","cursorBefore":true,"limit":25}
```

**Response Example**

```json
{"success":true,"data":{"source":"google","keyword":"keyword research","suggestions":[{"value":"keyword research tool","relevance":0.92,"type":"autocomplete"}]}}
```

### Keyword Research Suite API

- **Endpoint:** `/api/v1/seo-tools/keyword-research-suite`
- **SEO Title:** Keyword Research API | Search Volume, CPC, Competition and Related Terms
- **SEO Description:** Research profitable keywords with search volume, CPC, difficulty, semantic clusters, and intent-aware suggestions in a single normalized API.
- **Best Fit Tier:** `gateway-light+cache`
- **MVP Features:** volume; CPC; competition; related terms; intent classification; clustering
- **What Makes It Different:** single response across multiple providers; cluster-ready output; export-friendly JSON
- **Future Extensions:** historical trends; competitor overlap; keyword gap reports; alerts

**Request Example**

```json
{"keywords":["seo api"],"source":"google","country":"US","language":"en","includeRelated":true}
```

**Response Example**

```json
{"success":true,"data":{"keywords":[{"term":"seo api","searchVolume":1900,"cpc":4.2,"competition":"medium","intent":"commercial"}],"clusters":[{"topic":"seo api","terms":["seo api","seo tools api"]}]}}
```

### Site Audit Suite API

- **Endpoint:** `/api/v1/seo-tools/site-audit-suite`
- **SEO Title:** Website SEO Audit API | Technical SEO, Content, Links and Issue Prioritization
- **SEO Description:** Run structured website audits that score technical SEO, meta data, links, images, performance, and issue severity across single pages or crawled sites.
- **Best Fit Tier:** `async-heavy`
- **MVP Features:** single page and crawl; issue code taxonomy; weighted score; page and site summary; export-ready results
- **What Makes It Different:** stable issue codes; profile-based auditing; agency-friendly JSON for downstream automation
- **Future Extensions:** scheduled audits; historical comparisons; Jira/Linear export; custom rules

**Request Example**

```json
{"startUrl":"https://example.com","crawl":true,"maxPages":100,"profiles":["technical","content","links","images"]}
```

**Response Example**

```json
{"success":true,"data":{"siteScore":82,"pages":[{"url":"...","score":78,"issues":[{"code":"missing_meta_description","severity":"medium"}]}],"summary":{"critical":2,"high":6}}}
```

### Meta Tags Audit API

- **Endpoint:** `/api/v1/seo-tools/meta-tags-audit`
- **SEO Title:** Meta Tags Audit API | Analyze Title, Description, Open Graph and Twitter Tags
- **SEO Description:** Inspect page metadata and return titles, descriptions, canonical tags, robots tags, Open Graph, and social preview diagnostics.
- **Best Fit Tier:** `gateway-light`
- **MVP Features:** title and description extraction; canonical and robots; OG and Twitter tags; issue list
- **What Makes It Different:** preview-ready structured social metadata and normalized issue codes
- **Future Extensions:** rendered-preview images; snippet simulations; template drift detection

**Request Example**

```json
{"urls":["https://example.com"],"includeSocial":true}
```

**Response Example**

```json
{"success":true,"data":{"pages":[{"url":"...","title":"Example","description":"...","canonical":"...","openGraph":{"title":"Example"},"issues":["missing_twitter_card"]}]}}
```

### Headings Audit API

- **Endpoint:** `/api/v1/seo-tools/headings-audit`
- **SEO Title:** Headings Audit API | Validate H1 to H6 Structure for SEO
- **SEO Description:** Audit heading structure, hierarchy gaps, duplicate headings, and semantic heading quality across pages or sites.
- **Best Fit Tier:** `gateway-light`
- **MVP Features:** extract heading tree; hierarchy checks; duplicate heading detection; missing H1/H2 issues
- **What Makes It Different:** tree output that downstream docs and editors can use directly
- **Future Extensions:** content outline scoring; section intent classification

**Request Example**

```json
{"urls":["https://example.com"],"crawl":false}
```

**Response Example**

```json
{"success":true,"data":{"pages":[{"url":"...","headings":[{"level":"h1","text":"Main title"}],"issues":["multiple_h1"]}]}}
```

### Image SEO Audit API

- **Endpoint:** `/api/v1/seo-tools/image-seo-audit`
- **SEO Title:** Image SEO Audit API | Alt Text, File Size, Format and Dimension Analysis
- **SEO Description:** Analyze site images for missing alt text, oversized assets, weak formats, broken links, and responsive image coverage.
- **Best Fit Tier:** `gateway-light+cache`
- **MVP Features:** alt checks; size warnings; format warnings; missing dimensions; broken images
- **What Makes It Different:** SEO-specific image issue model instead of generic asset list
- **Future Extensions:** responsive srcset analysis; AI alt suggestion mode; WebP/AVIF recommendations

**Request Example**

```json
{"startUrl":"https://example.com","crawl":true,"maxPages":25,"sizeWarningKb":200}
```

**Response Example**

```json
{"success":true,"data":{"pages":[{"url":"...","images":[{"src":"...","altMissing":true,"sizeKb":340,"format":"jpeg"}]}],"summary":{"missingAlt":4}}}
```

### Performance Audit Suite API

- **Endpoint:** `/api/v1/seo-tools/performance-audit-suite`
- **SEO Title:** Performance Audit API | Lighthouse, Core Web Vitals and SEO Diagnostics
- **SEO Description:** Run page performance and Lighthouse-style audits with Core Web Vitals, issue prioritization, and compact JSON or report-friendly output.
- **Best Fit Tier:** `async-heavy`
- **MVP Features:** mobile and desktop strategies; normalized metric keys; issue list; optional HTML/PDF report artifact
- **What Makes It Different:** compact JSON contract plus richer artifact mode; batch-ready envelope
- **Future Extensions:** trend snapshots; budget assertions; CI webhook mode

**Request Example**

```json
{"urls":["https://example.com"],"strategy":"mobile","categories":["performance","seo"],"reportFormat":"json"}
```

**Response Example**

```json
{"success":true,"data":{"runs":[{"url":"...","strategy":"mobile","scores":{"performance":0.74,"seo":0.91},"metrics":{"lcpMs":2400,"cls":0.05}}]}}
```

### Link Health Monitor API

- **Endpoint:** `/api/v1/seo-tools/link-health-monitor`
- **SEO Title:** Link Health API | HTTP Status, Redirects, Broken Links and Uptime Checks
- **SEO Description:** Check URLs or crawl sites to detect broken links, redirect chains, slow responses, and availability issues with actionable diagnostics.
- **Best Fit Tier:** `gateway-light+async`
- **MVP Features:** bulk URL checks; redirects; crawl mode; response timing; broken fragment support
- **What Makes It Different:** single contract for uptime and SEO link health; chain visualization fields
- **Future Extensions:** scheduled monitors; alert webhooks; SLA snapshots

**Request Example**

```json
{"urls":["https://example.com"],"crawl":false,"followRedirects":true,"timeoutMs":5000}
```

**Response Example**

```json
{"success":true,"data":{"results":[{"url":"...","status":301,"finalUrl":"https://www.example.com","chain":[301],"responseTimeMs":420}],"summary":{"broken":0,"redirects":1}}}
```

### Sitemap Suite API

- **Endpoint:** `/api/v1/seo-tools/sitemap-suite`
- **SEO Title:** Sitemap API | Detect Existing Sitemaps or Generate XML, HTML and TXT Sitemaps
- **SEO Description:** Detect sitemap locations or crawl a site to generate XML, HTML, and plain-text sitemap outputs with crawl diagnostics.
- **Best Fit Tier:** `gateway-light+async`
- **MVP Features:** detect mode; generate mode; XML/HTML/TXT outputs; canonical URL normalization; crawl limits
- **What Makes It Different:** both discovery and generation under one contract
- **Future Extensions:** image and video sitemap support; priority and lastmod heuristics; delta generation

**Request Example**

```json
{"action":"detect","startUrl":"https://example.com","formats":["xml","html"]}
```

**Response Example**

```json
{"success":true,"data":{"action":"detect","sitemaps":["https://example.com/sitemap.xml"],"generated":null}}
```

## ToolNexus Integration Contract

The actual `ToolNexus` repo already has a governed onboarding model, so DataLens tools should be integrated into that model rather than bypassing it.

### What ToolNexus Requires

| Rule ID | Area | Required Rule | Practical Meaning For DataLens |
| --- | --- | --- | --- |
| TN-001 | Slug governance | Tool slug must be unique, lowercase, stable, and URL-safe. | Do not mirror raw marketplace titles. Normalize every backlog item into a canonical slug and map duplicates to the same slug. |
| TN-002 | Manifest minimum fields | tools.manifest.json entries require slug, title, category, actions, seoTitle, seoDescription, and exampleInput. | Every DataLens family needs a ToolNexus-ready metadata record before UI or executor work starts. |
| TN-003 | Runtime assets | A ToolShell page expects a tool manifest JSON, runtime JS module, and HTML template under the governed ToolNexus paths. | For external APIs, create lightweight ToolShell assets that collect input, call the execution API, and render normalized results. |
| TN-004 | Executor contract | Each tool needs an IToolExecutor implementation with a Slug and SupportedActions aligned to the manifest. | Add a reusable DataLens proxy executor or generated executor per slug instead of wiring UI directly to external APIs. |
| TN-005 | Execute API request contract | ToolNexus execute requests are sent as { input: <json>, options: { key: value } }. | Design DataLens endpoints so ToolNexus can pass the entire input object into the endpoint body with minimal reshaping. |
| TN-006 | Execute API response contract | ToolNexus expects execution output as a string plus success, error, notFound, insight, and runtime identity metadata. | Wrap DataLens JSON responses as serialized output strings or add a dedicated ToolNexus adapter that extracts the normalized payload. |
| TN-007 | Execution policy defaults | ToolNexus defaults to 15s timeout, 512KB payload, anonymous=false, concurrency=16, and validates blueprint policy fields. | Mark public low-risk tools anonymous only after review. Set stricter per-tool policy for heavy scrapers and large-input tools. |
| TN-008 | Blueprint hard limits | Tool blueprint validation caps timeout at 120s, max requests per minute at 600, and max input size at 5,000,000 bytes. | Any DataLens contract that needs more than these values should be async or private, not a direct public ToolNexus tool. |
| TN-009 | Order of work | Manifest and executor first, UI after shell contract passes. | For import work: finalize canonical slug, actions, contract, and policy before spending time on ToolShell polish. |
| TN-010 | Docs requirement | Public tool pages and example coverage are validated as part of ToolNexus governance. | Each family needs a docs page with plain-language examples, SEO copy, FAQs, and supported actions. |
| TN-011 | Recommended bridge pattern | Use ToolNexus executor as the public boundary and let that executor call DataLens APIs or internal workers. | Do not embed DataLens endpoint URLs directly in page JavaScript. Keep routing, retries, auth, and policy enforcement server-side. |
| TN-012 | Unsafe tool gating | Public catalog tools should avoid abuse-oriented capabilities even if technically possible. | Traffic generators, fake engagement, and manipulative view tools should be rejected from public ToolNexus onboarding. |

### Correct Import Order For ToolNexus

1. Normalize the raw backlog ticket into a canonical family and stable slug.
2. Add the ToolNexus manifest row with title, category, actions, SEO metadata, and example input.
3. Add or generate a ToolNexus executor that calls DataLens server-side.
4. Add execution policy defaults: timeout, payload, rate limit, concurrency, auth mode.
5. Add ToolShell assets only after executor and manifest alignment are correct.
6. Add a public docs page with examples and FAQs.
7. Validate one happy path before any UI polish.

### Recommended ToolNexus Bridge Pattern

- ToolNexus UI should call the ToolNexus execution API, not DataLens directly.
- ToolNexus executor should translate `{ input, options }` into the DataLens request body.
- Executor should serialize DataLens JSON into the ToolNexus `Output` string contract.
- ToolNexus remains the policy and governance boundary for slug, auth, caching, rate limits, and docs.

### Example Mapping

**ToolNexus Execute Request**

```json
{
  "input": {
    "urls": ["https://example.com"],
    "keywords": ["seo audit"]
  },
  "options": {
    "profile": "standard"
  }
}
```

**ToolNexus Executor -> DataLens Body**

```json
{
  "urls": ["https://example.com"],
  "keywords": ["seo audit"],
  "profile": "standard"
}
```

**ToolNexus Public Response**

```json
{
  "success": true,
  "output": "{"success":true,"data":{...}}",
  "error": null,
  "notFound": false,
  "insight": null,
  "runtimeIdentity": {
    "runtimeType": "api",
    "adapter": "datalens-proxy",
    "workerType": "http",
    "fallbackUsed": false,
    "executionAuthority": "ToolNexus"
  }
}
```

## Recommended Build Order

### Phase 1

- `keyword-density-and-presence-audit`
- `search-suggestions-explorer`
- `keyword-research-suite`
- `site-audit-suite`
- `meta-tags-audit`
- `headings-audit`
- `image-seo-audit`
- `link-health-monitor`
- `sitemap-suite`
- `tech-stack-detector-suite`
- `qr-code-studio`
- `pdf-conversion-suite`

### Phase 2

- Add policy engine, auth, rate limiting, async jobs, and artifact storage.
- Import the first ToolNexus-facing manifest and executor set.
- Add contract tests and docs pages for each published family.

### Phase 3

- Add the more expensive async families such as performance audits, accessibility audits, rank tracking, and content optimization.
- Bring in selected market-intelligence families only after the provider abstraction layer is stable.

## Final Recommendation

Do **not** implement the raw ticket list directly. Convert it into canonical families, build a policy-driven platform underneath those families, and onboard only the high-signal families first. The biggest difference-maker is not adding more endpoints; it is making the first wave deeply structured, reusable, ToolNexus-compatible, and future-safe.

## Source Deliverables

- `docs/reports/2026-03-26-datalens-repo-forensic-findings.csv`
- `docs/reports/2026-03-26-toolnexus-integration-contract.csv`
- `docs/reports/2026-03-26-api-family-implementation-plan.csv`
- `docs/reports/2026-03-26-api-forensic-implementation-plan.md`

