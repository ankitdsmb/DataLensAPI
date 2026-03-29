# 2026-03-28 Deep API Forensic Analysis

## Scope

- Audit basis: current local repository on the post-integration branch, after safe fast-forward to the latest `origin/main` and replay of preserved forensic artifacts.
- GitHub posture: this audit reflects the integrated latest upstream platform state rather than the earlier pre-integration snapshot.
- Planned rows reviewed from the allowlist: 245. Rows marked `Created: Yes`: 154. Rows marked `Created: No`: 91.
- Live local route directories reviewed one by one: 152.
- Important drift note: live SEO routes are now represented in the plan file, while generic operational job routes remain governed by the canonical route allowlist.

## Executive Findings

1. The repo currently has more API breadth than logic depth.
2. The strongest implementation area is the shared SEO audit analyzer layer in `packages/scraping-core/src/seoAudit.ts`.
3. The async runtime now exists, but it is still minimal and some worker outputs remain synthetic or preview-grade.
4. The primary blocker is now truth and governance sync across code, plan docs, allowlists, and forensic reports.
5. Canonical route families are present and are the right long-term direction for maintainability.
6. Free hosting is realistic only for a narrow allowlisted subset with launch-guard enforcement.
7. Traffic and fake-engagement families still require quarantine or internal-only treatment for honest public launch.

## Inventory Snapshot

| Metric | Value |
| --- | ---: |
| Planned rows in allowlist | 245 |
| Rows marked Created = Yes | 154 |
| Rows marked Created = No | 91 |
| Live local route directories | 152 |
| Routes using `readJsonBody` | 152 |
| Routes still using raw `JSON.parse` locally | 2 |
| Routes with local strict allowed-field checks | 152 |

### Implementation Classes

| Class | Count |
| --- | ---: |
| `audit-suite` | 8 |
| `crawler-tool` | 5 |
| `network-wrapper` | 28 |
| `html-scraper` | 44 |
| `local-utility` | 32 |
| `link-builder` | 26 |
| `template-link-builder` | 1 |
| `queued-placeholder` | 8 |

### Functional Families

| Family | Count |
| --- | ---: |
| `audit-and-quality` | 15 |
| `developer-utility` | 5 |
| `domain-intelligence` | 10 |
| `general-public-data` | 53 |
| `keyword-discovery` | 17 |
| `knowledge-base-connector` | 6 |
| `public-connector` | 20 |
| `social-public-data` | 5 |
| `tech-stack` | 3 |
| `traffic-simulation` | 12 |
| `travel-connector` | 6 |

### Duplicate Endpoints in the Plan File

- `/api/v1/seo-tools/axe-accessibility-tester`: TN-API-19770, TN-API-19771
- `/api/v1/seo-tools/broken-link-checker`: TN-API-19791, TN-API-19792
- `/api/v1/seo-tools/google-search`: TN-API-19980, TN-API-19981

### Planned but Not Implemented Yet

| Category | Count of `Created: No` rows |
| --- | ---: |
| Developer Tools | 33 |
| Seo Tools | 58 |

### Live Routes Missing From Plan File

- None.

## GitHub-First Reconciliation

- The local working branch has now been safely rebased operationally onto the latest upstream state via fast-forwarded `main` plus a clean integration branch.
- Strict allowed-field validation is now present on 152 live SEO routes.
- Remaining GitHub-first concerns are now about document truth and launch governance, not missing upstream platform work.

## Architecture Gaps

### 1. Source of Truth Drift

- The main remaining drift is between route-executable reality and downstream planning/forensic documents that still reference older snapshots.
- Developer/SEO intake planning and canonical route allowlisting now need explicit separation from generic operational routes such as jobs.
- The route allowlist should remain the executable source of truth, with the intake list serving as request/backlog truth.

### 2. Async Runtime Gap

- A real job contract, job status endpoint, artifact endpoint, and worker entrypoint now exist.
- The gap is no longer absence of runtime; the gap is that some worker implementations still produce simulated or preview-grade outputs.
- Queued routes should be graded individually as real, preview, internal-only, or blocked.

### 3. Shared Provider Gap

- Shared family modules now exist for site audit, keyword discovery, and domain intelligence.
- The remaining gap is uneven migration: many older routes still carry shallow or inline provider logic instead of using stronger family-level abstractions.

### 4. Contract / Validation Gap

- All live routes use `readJsonBody`, which is a good baseline.
- Raw `JSON.parse` usage across live SEO routes is now down to 2.
- Strict allowed-field validation is present on 152 live SEO routes.
- The next contract task is to keep route metadata and route promises aligned with those stronger contracts.

### 5. Public Launch / Abuse Control Gap

- Launch guard, API-key boundary, in-memory rate limiting, and concurrency caps now exist.
- The gap is that those controls still need final truth-sync with docs, plus stronger durability if multi-instance or longer-lived public launch is expected.
- Public launch should remain narrow until blocked and simulated routes are explicitly quarantined or strengthened.

## Current Architecture Readout

### Workspace Shape

- Root workspace: `forensic-api-suite` with Turbo and npm workspaces.
- API entrypoint: `apps/api-gateway` running Next.js route handlers.
- Shared runtime code: `packages/scraping-core`.
- Shared types: `packages/shared-types`.
- Async execution service: `apps/scraper-service`, currently only a placeholder Express process.

### What Is Strong Today

- The route envelope pattern is consistent enough that response standardization is achievable.
- `readJsonBody` gives the repo a common request-reading baseline.
- `packages/scraping-core/src/seoAudit.ts` is the best reusable logic asset in the codebase.
- The allowlist file gives the team a practical inventory boundary for cleanup and prioritization.

### What Is Weak Today

- Route handlers are still uneven: some use strong family/platform helpers, while many weaker routes still expose shallow behavior.
- Durability is still lightweight: jobs and artifacts are not yet backed by a stronger shared persistence model suitable for scale.
- Several routes are still marketed more richly than their current implementation depth justifies.
- Documentation still contains older snapshot assumptions that need one more truth pass.

## Target Architecture to Max Level

### 1. Thin Gateway Layer

- Keep Next.js route handlers extremely small: validate input, call a provider/service, shape the envelope, and return.
- Move parsing, provider calls, normalization, and scoring out of route files.

### 2. Provider Modules by Family

- Create provider modules under `packages/scraping-core/src/providers/*`.
- Suggested families: `keywordProviders`, `domainProviders`, `connectorProviders`, `reviewProviders`, `geoProviders`, `performanceProviders`.
- Each provider should own request building, retry policy, safe parsing, DTO normalization, and error mapping.

### 3. Canonical Product Families Instead of Ticket Routes

- Merge duplicated SEO audit SKUs into one canonical `site-audit` family with `light`, `crawl`, and `rendered` modes.
- Merge keyword discovery SKUs into one `keyword-discovery` family with provider switches.
- Merge domain tools into one `domain-intelligence` family with optional submodules.
- Deprecate routes that are only links unless they are honestly labeled as redirect helpers.

### 4. Real Async Runtime

- Introduce a durable `Job` contract with `queued`, `running`, `succeeded`, `failed`, and `expired` states.
- Add `/api/v1/jobs/{id}` style status access, artifact pointers, timestamps, and structured errors.
- Make browser, PDF, screenshot, long crawl, and report-generation features go through workers only.

### 5. Artifact and Cache Layer

- Persist reports, screenshots, generated PDFs, and crawl results outside memory.
- Add a small cache for deterministic public wrappers such as autocomplete, lookups, and connectors.
- Cache keys should include normalized inputs and locale parameters.

### 6. Policy and Abuse-Control Layer

- Add per-route policy metadata: timeout, max URLs, max crawl pages, auth requirement, free-tier eligibility.
- Add API-key auth, basic IP/key throttling, and concurrency caps.
- Remove or quarantine traffic-simulation products from public anonymous launch.

### 7. Observability Layer

- Add request IDs, provider timing metrics, route-level error codes, and job lifecycle logging.
- Track provider failure rate, cache hit rate, crawl size, and artifact generation cost.

## Free-Hosting Deployment Blueprint

### Phase 1: What Can Realistically Run on a Free Server

- Public wrappers with tiny payloads and deterministic parsing.
- Lightweight HTML-only audits on single pages.
- Small local utilities such as markdown generation or text transforms.
- Narrow network checks with very small input caps.

### Phase 2: What Should Be Disabled Until Paid or Worker-Backed

- Multi-page crawls over more than a tiny page cap.
- Lighthouse, screenshot, PDF, and rendered-browser features.
- Large provider fan-out queries or bulk enrichment workflows.
- Any traffic, engagement, or view-generation route.

### Minimal Free-Tier Topology

- One small stateless gateway for synchronous lightweight routes.
- One tiny persistent store for job metadata and cached responses.
- Zero public exposure for unfinished queued routes until the worker exists.
- Hard caps everywhere: input size, URL count, crawl depth, concurrency, and timeout.

### What You Need Before Public Launch

- Canonical route families instead of ticket-by-ticket surface sprawl.
- Real auth and throttling.
- A tiny but durable job store.
- One worker execution path for browser and long-running features.
- Honest docs that separate lite routes from full product routes.

## Priority Remediation Ladder

1. Sync local with GitHub `main` and resolve route inventory drift before adding more APIs.
2. Replace raw `JSON.parse` usage with safe parsing and strict allowed-field validation everywhere.
3. Collapse duplicate audit and keyword routes into canonical families.
4. Remove, hide, or relabel all link-only routes that currently over-promise.
5. Build the real job runtime before exposing any queued placeholder as a product.
6. Add auth, throttling, and route policy metadata before any free public launch.
7. Rewrite stale architecture docs so the repo tells the truth about itself.

## Free Hosting Reality Check

| Workload Type | Reality on Free Hosting | Recommendation |
| --- | --- | --- |
| Lightweight public JSON wrappers and small HTML scrapers | Realistic on Vercel/Cloudflare if capped tightly | Keep them lightweight, add cache and throttling |
| Multi-page crawls | Borderline because the current code is synchronous and sequential | Keep tiny on free tier or move behind async jobs |
| Browser audits, Lighthouse, screenshots, PDFs | Not realistic as synchronous free-tier public endpoints | Build a real async worker plus artifact storage |
| Traffic and fake-engagement tools | Policy-conflicted and abuse-prone | Remove from public launch or repurpose into compliant owned-site QA only |
| Public anonymous launch without auth/rate limits | Not safe | Add API keys, IP/key throttling, and per-tool policies first |

## Route-by-Route Appendix

The appendix below covers each live local route one by one. The assessments are based on the actual route file plus the current promise in `dev-and-seo-tooling-list.md`.

## Audit-Suite Routes

| Endpoint | Promise | Strength | Coverage | Current Logic | Biggest Gap | Best-Ever Upgrade | Free-Tier Fit | GitHub Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/v1/seo-tools/axe-accessibility-tester` | WCAG audits using axe-core. | 4/5 | ~70% | Real lightweight HTML audit using shared analyzers and synthetic scoring. | Still limited to source HTML; browser evidence and artifact history are missing. | Collapse duplicate audit routes into canonical families with light, rendered, and async modes. | Good free-tier fit for capped HTML mode; richer audit modes need workers. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/axe-core-accessibility-checker-actor` | Accessibility testing engine (axe-core). | 4/5 | ~70% | Real lightweight HTML audit using shared analyzers and synthetic scoring. | Still limited to source HTML; browser evidence and artifact history are missing. | Collapse duplicate audit routes into canonical families with light, rendered, and async modes. | Good free-tier fit for capped HTML mode; richer audit modes need workers. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/competitor-based-keyword-recommendations-for-on-page-seo` | Keyword-based on-page SEO insights + competitors. | 4/5 | ~70% | Real lightweight HTML audit using shared analyzers and synthetic scoring. | Still limited to source HTML; browser evidence and artifact history are missing. | Collapse duplicate audit routes into canonical families with light, rendered, and async modes. | Good free-tier fit for capped HTML mode; richer audit modes need workers. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/seo-h1-h6-headings-checker` | H1-H6 structure audit + recommendations. | 4/5 | ~70% | Real lightweight HTML audit using shared analyzers and synthetic scoring. | Still limited to source HTML; browser evidence and artifact history are missing. | Collapse duplicate audit routes into canonical families with light, rendered, and async modes. | Good free-tier fit for capped HTML mode; richer audit modes need workers. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/seo-report-generator` | SEO report generation. | 4/5 | ~70% | Real lightweight HTML audit using shared analyzers and synthetic scoring. | Still limited to source HTML; browser evidence and artifact history are missing. | Collapse duplicate audit routes into canonical families with light, rendered, and async modes. | Good free-tier fit for capped HTML mode; richer audit modes need workers. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/seo-site-checkup` | SEO site checkup: speed, mobile, security. | 4/5 | ~70% | Real lightweight HTML audit using shared analyzers and synthetic scoring. | Still limited to source HTML; browser evidence and artifact history are missing. | Collapse duplicate audit routes into canonical families with light, rendered, and async modes. | Good free-tier fit for capped HTML mode; richer audit modes need workers. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/the-seo-content-optimizer` | Analyze top results + rewrite to compete. | 4/5 | ~70% | Real lightweight HTML audit using shared analyzers and synthetic scoring. | Still limited to source HTML; browser evidence and artifact history are missing. | Collapse duplicate audit routes into canonical families with light, rendered, and async modes. | Good free-tier fit for capped HTML mode; richer audit modes need workers. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/w3c-html-reporter` | HTML validity reports. | 4/5 | ~70% | Real lightweight HTML audit using shared analyzers and synthetic scoring. | Still limited to source HTML; browser evidence and artifact history are missing. | Collapse duplicate audit routes into canonical families with light, rendered, and async modes. | Good free-tier fit for capped HTML mode; richer audit modes need workers. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |

## Crawler and Graph Routes

| Endpoint | Promise | Strength | Coverage | Current Logic | Biggest Gap | Best-Ever Upgrade | Free-Tier Fit | GitHub Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/v1/seo-tools/broken-link-checker` | Crawl site + broken links (incl. fragments). | 3/5 | ~55% | Real crawl/graph logic over a constrained number of pages. | Synchronous in-memory crawling will not scale without async jobs and storage. | Move larger crawl workflows behind a queue and artifact layer. | Borderline on free serverless; use strict page caps. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/broken-link-checker-ensure-your-websites-integrity` | Broken link detection for site health. | 3/5 | ~55% | Real crawl/graph logic over a constrained number of pages. | Synchronous in-memory crawling will not scale without async jobs and storage. | Move larger crawl workflows behind a queue and artifact layer. | Borderline on free serverless; use strict page caps. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/url-mapper` | Crawl single page and return internal URLs. | 3/5 | ~55% | Real crawl/graph logic over a constrained number of pages. | Synchronous in-memory crawling will not scale without async jobs and storage. | Move larger crawl workflows behind a queue and artifact layer. | Borderline on free serverless; use strict page caps. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/website-broken-links-redirects-checker` | Broken links + redirects analysis. | 3/5 | ~55% | Real crawl/graph logic over a constrained number of pages. | Synchronous in-memory crawling will not scale without async jobs and storage. | Move larger crawl workflows behind a queue and artifact layer. | Borderline on free serverless; use strict page caps. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/website-links-graph-generator` | Link graph + JSON export. | 3/5 | ~55% | Real crawl/graph logic over a constrained number of pages. | Synchronous in-memory crawling will not scale without async jobs and storage. | Move larger crawl workflows behind a queue and artifact layer. | Borderline on free serverless; use strict page caps. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |

## Network and Lookup Wrapper Routes

| Endpoint | Promise | Strength | Coverage | Current Logic | Biggest Gap | Best-Ever Upgrade | Free-Tier Fit | GitHub Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/v1/seo-tools/api-gw-lite` | Proxy translating custom fields to HTTP requests. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/apideck` | List integrations available on an Apideck instance. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/arcgis-geocode` | Convert address/text to geolocation. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/bing-microsoft-translator` | Translate text. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/check-available-domain-names` | Check domain names + expiry. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/clearbit-combined` | Enrich person + company. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/clearbit-company` | Company enrichment. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/clearbit-person` | Person enrichment. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/company-domain` | Find company website + socials. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/data-gov-india-actor` | Access/search Data.gov.in datasets. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/dns-lookup-forward-and-reverse-a-mx-txt-dmarc-ptr` | DNS/Reverse DNS lookup. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/domain-availability-checker` | Domain availability check. | 3/5 | ~35% | Performs a live DNS availability check against public resolvers. | Only checks resolver status; registrar-grade availability evidence is still missing. | Keep public as a lite availability signal or deepen with registrar/RDAP evidence. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/domain-availability-expiry-whois-dns-ip-asn-70-tld` | Availability + WHOIS + DNS + ASN. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/domain-checker` | Availability + market value; suggestions. | 3/5 | ~35% | Performs a live DNS availability check against public resolvers. | Market value, suggestions, and enrichment remain unimplemented. | Either keep it as a lite DNS availability tool or fold it into the canonical domain suite. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/domain-inspector` | DNS/WHOIS/HTTP/SSL for domains. | 3/5 | ~45% | Performs live DNS and HTTP inspection for a single domain. | WHOIS and SSL posture are still not implemented despite the broader product promise. | Share the canonical domain suite DTOs and add optional WHOIS/SSL enrichment. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/domain-intelligence-suite` | Canonical light suite route for domain availability, DNS snapshot, and HTTP snapshot after upstream family consolidation. | 3/5 | ~50% | Runs live DNS lookups plus an HTTPS reachability snapshot and returns normalized light-mode evidence. | WHOIS, ASN, and SSL certificate inspection are still null in light mode. | Promote into the full canonical domain intelligence family with WHOIS/RDAP, SSL parsing, and registrar enrichment. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/ebay-keywords-discovery-tool` | Ebay search suggestions. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/network-security-scanner` | SSL details for IPs/subnets. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/pagespeed-insights-checker` | Pagespeed insights for URLs. | 2/5 | ~20% | Network timing plus a few HTTP headers only. | Not real PageSpeed Insights or Lighthouse output. | Replace with a real performance-audit provider and artifact mode. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/reddit` | Reddit posts search + subreddit data. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/reverse-dictionary-api` | Word finder from descriptions. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/search-keyword-research` | Keyword volume/CPC/competition reports. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/sitemap-detector` | Find sitemap URLs fast. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/subdomain-finder-reverse-ip` | Subdomain + reverse IP enumeration. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/tumblr-availability-checker` | Tumblr name availability. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/url-shortener` | Shorten list of URLs. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/website-speed-checker` | Lighthouse metrics + Core Web Vitals. | 2/5 | ~25% | Low-level response timing and header check. | No CWV or Lighthouse metrics. | Keep as a sub-check only inside a true performance suite. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/youtube-music-autocomplete` | YouTube Music autocomplete. | 2/5 | ~35% | Performs a low-level network lookup/check and returns thin diagnostics. | Often too shallow relative to the marketed feature set. | Either relabel as lite network diagnostics or deepen the provider integration. | Easy to host; product depth is the main issue. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |

## HTML Scraper Routes

| Endpoint | Promise | Strength | Coverage | Current Logic | Biggest Gap | Best-Ever Upgrade | Free-Tier Fit | GitHub Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/v1/seo-tools/appodeal-benchmark` | App monetization benchmark metrics. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/appsumo` | AppSumo deals list. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/author-finder` | Find author info on webpages. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/bluesky` | Collect/search posts, track follows. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/built-with-updated-current-technologies` | Current tech stack detection. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/builtfirst` | Software deals from Builtfirst. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/builtwith-bulk-urls` | Tech lookups for bulk URLs. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/builtwith-technology-looker` | Tech lookup for a site. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/candor` | Salary/offer data from Candor.co. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/canny` | Boards/roadmaps/feature requests. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/capterra` | Reviews + alternatives from Capterra. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/cb-insights` | Company/analyst data from CB Insights. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/chartmetric` | Music artist insights. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/cms-checker` | Tech stack + competitors. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/cms-checker-bulk` | Tech stack + competitors in bulk. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/cols-app` | High-scale data extraction (generic). | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/community` | Apify Community discussions hub. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/compasscom` | Property search/filters for US listings. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/crisp` | Help center categories + articles. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/ebay-smart-shopper` | eBay data collector + price analysis. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/etsy-product-description` | Etsy listing details. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/flippa` | Businesses for sale on Flippa. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/front-knowledge-base` | Front KB categories + articles. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/funnel-sniper` | CTA + pricing signal detection on ecommerce. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/gainsight-ideas` | Ideas + statuses from Gainsight Ideas. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/mastodon` | Trends/statuses/hashtags from Mastodon. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/mastodon-bulk` | Mastodon trends in bulk. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/media-set` | Generic media data extraction. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/movie-news` | Movie news data extraction. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/myanimelist` | MyAnimeList content data. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/partner-fleet` | App marketplace integrations (Partner Fleet). | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/partnerbase` | Partnerships database. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/partnerpage` | Services/integrations from Partnerpage. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/pricing-page-analyzer` | Analyze pricing pages for CRO insights. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/readability-analyzer` | Readability analysis and scoring. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/rivalflowai` | Competitor discovery. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/simple-bbb` | BBB company reviews + complaints. | 3/5 | ~45% | Fetches the public BBB search page, parses visible business matches, and enriches the best match with profile metadata, BBB rating evidence, and complaint signals. | Still does not paginate customer reviews or return a normalized complaints timeline across all matched companies. | Promote into a marketplace-review connector with reusable BBB parsers, bulk enrichment, and structured complaint/review timelines. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/trustpilot-plus` | Trustpilot reviews + sentiment. | 3/5 | ~40% | Fetches the public Trustpilot review page and extracts aggregate rating plus review-count evidence when the identifier resolves directly. | Still depends on a resolvable review identifier and does not paginate individual reviews or compute sentiment. | Promote into a marketplace-review connector with identifier discovery, review pagination, and normalized sentiment/review DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/uservoice` | UserVoice forums + feature requests. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/web-design-grader` | Design effectiveness evaluation + recommendations. | 2/5 | ~20% | Simple heuristic scoring based on hero/image/button presence. | Far below the promised design/conversion intelligence. | Replace with screenshot-backed rubric and recommendation engine. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/what-site` | Site title + description lookup. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/whatruns` | Tech stack detection via Whatruns. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/youtube-region-restriction-checker` | Region restrictions for videos. | 3/5 | ~45% | Fetches the public YouTube watch page and parses playability plus availableCountries evidence. | Still depends on watch-page HTML and does not independently verify playback from each market. | Promote into a canonical YouTube availability tool with stronger extraction, retries, and optional country-by-country probe modes. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/zoho-help-center` | Zoho Desk help center categories + articles. | 3/5 | ~45% | Fetches live HTML and extracts a narrow set of visible fields. | Selectors are shallow and usually miss pagination, schema, or deep entity normalization. | Push repeated extraction into shared provider adapters and normalized DTOs. | Usually fine on free serverless if inputs stay capped. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |

## Local Utility Routes

| Endpoint | Promise | Strength | Coverage | Current Logic | Biggest Gap | Best-Ever Upgrade | Free-Tier Fit | GitHub Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/v1/seo-tools/amazon-keywords-discovery-tool` | Amazon search suggestions. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/app-store-keywords-discovery-tool` | App Store search suggestion keywords. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/app-store-search-suggestions` | Search suggestions for App Store. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/barcode` | Barcode lookup for UPC/EAN/ISBN/GTIN. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/bing-keywords-discovery-tool` | Bing suggestions. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/google-autocomplete-apify` | Live Google autocomplete ideas; locale support. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/google-play-keywords-discovery-tool` | Google Play suggestions + trends. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/markdown-table-generator` | Convert data to markdown table. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/moz-da-pa-spam-checker` | DA/PA spam checks. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/new-web-traffic-generator-youtube-vimeo-twitch` | Realistic traffic simulation for web + video. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Poor public fit: policy-conflicted, abuse-prone, and not compliant for public launch. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/openpagerank-bulk-checker` | Bulk OpenPageRank scores. | 1/5 | ~5% | Normalizes domains and returns an explicit internal provider-template contract with non-executed provider state. | No live provider data exists yet. | Either integrate the provider or keep it internal-only as a provider template. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/organic-visit-simulator-x` | Organic traffic triggered by viral posts. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Poor public fit: policy-conflicted, abuse-prone, and not compliant for public launch. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/plagiarism-checker` | Plagiarism detection with report. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/pro-seo-audit-tool-get-your-website-data-for-search-engines` | Pro SEO audit tool. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/profanity-checker` | Remove profanity; custom lists. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/search-suggestions-explorer` | Canonical multi-provider keyword/search-suggestion exploration route added after upstream refactor. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/seo-audit-tool` | SEO audit for broken links/missing images. | 4/5 | ~75% | Real multi-section HTML audit with scores and issues. | No browser execution, artifacts, or history. | Merge duplicate audit SKUs into one canonical family with modes. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/serp-meta-title-generator` | Generate meta titles with competitive analysis. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/site-audit-suite` | Canonical light site-audit suite route added after upstream family consolidation. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/smart-website-traffic` | Targeted traffic + crawl/stress test. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Poor public fit: policy-conflicted, abuse-prone, and not compliant for public launch. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/social-media-hashtag-generator` | Multi-keyword hashtag generator. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/spell-checker` | Spell/grammar check for many languages. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/topic-trend-aggregator` | Aggregates multi-pipeline news topics. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/traffic-booster` | Quick traffic boosts for analytics/tests. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Poor public fit: policy-conflicted, abuse-prone, and not compliant for public launch. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/traffic-generator-youtube-web-etsy-behance-and-many-more` | Traffic generation across platforms. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Poor public fit: policy-conflicted, abuse-prone, and not compliant for public launch. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/web-traffic-boots` | Realistic GA traffic generation. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Poor public fit: policy-conflicted, abuse-prone, and not compliant for public launch. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/web-traffic-spike-simulator-x` | Traffic spikes triggered by viral posts. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Poor public fit: policy-conflicted, abuse-prone, and not compliant for public launch. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/website-traffic-generator-pro` | Human-like traffic generation. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Poor public fit: policy-conflicted, abuse-prone, and not compliant for public launch. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/website-traffic-machine` | Proxy + search-engine traffic generation. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Poor public fit: policy-conflicted, abuse-prone, and not compliant for public launch. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/websites-traffic-generator` | Geo/device traffic simulation. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Poor public fit: policy-conflicted, abuse-prone, and not compliant for public launch. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/youtube-keywords-discovery-tool` | YouTube search suggestions + related terms. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/youtube-suggester` | YouTube autocomplete ideas. | 2/5 | ~25% | Implements a local heuristic or convenience transform without a real provider. | Many are useful as lite helpers but not strong enough for the current product promise. | Relabel as lite utilities or back them with stronger engines/providers. | Excellent technical fit for free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |

## Link-Builder Routes

| Endpoint | Promise | Strength | Coverage | Current Logic | Biggest Gap | Best-Ever Upgrade | Free-Tier Fit | GitHub Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/v1/seo-tools/bulk-bbb` | BBB complaints/reviews in bulk. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/business-websites-ranker` | Find underperforming local businesses. | 1/5 | ~10% | Builds a Google Maps search URL only. | No ranking, enrichment, or website scoring logic. | Rebuild inside a maps-intelligence family. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/car-hire-rental` | Car rental prices by location. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/car-hire-rental-bulk` | Car rental prices in bulk. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/opentable` | OpenTable search + availability. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/rentcast` | Rent estimates for US properties. | 1/5 | ~10% | Builds a normalized lookup URL and returns an explicit internal provider-template contract. | No live provider data. | Either integrate the provider or keep it internal-only as a provider template. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/shopify-product-search` | Search products with metadata. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/showtimes` | Showtimes data extraction. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/similarweb` | Website analytics (public data). | 1/5 | ~10% | Returns a Similarweb report URL only. | No analytics extraction or normalization. | Rebuild as real traffic intelligence or relabel honestly. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/skyscanner-cars` | Car rental prices + filters. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/skyscanner-hotels` | Hotels search + prices. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/software-advice` | Products/reviews/stats from Software Advice. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/spotify` | Search Spotify tracks/artists/albums, etc. | 1/5 | ~10% | Returns a Spotify search URL only. | No track, artist, album, playlist, or pagination data. | Implement a real provider-backed media connector. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/spotify-plus` | Spotify with no limits. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/spyfu` | Spyfu keywords/ads/domain stats. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/spyfu-bulk-urls` | Spyfu data in bulk. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/stackshare` | Tech stacks + tool comparisons. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/the-org` | Org charts + open jobs from The Org. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/trending-news` | Trending news extraction. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/tripadvisor-cruises` | Cruise listings from Tripadvisor. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/tripadvisor-hotels` | Hotels from Tripadvisor. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/vrbo` | Vrbo properties + reviews. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/x-twitter` | Tweets + usernames from X. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/youtube-view-generator` | Increase YouTube views. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Poor public fit: policy-conflicted, abuse-prone, and not compliant for public launch. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/youtube-view-generator-124-test-events-124-0001` | Test-only variant of view generator. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Poor public fit: policy-conflicted, abuse-prone, and not compliant for public launch. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/zapier` | Zapier integrations + templates list. | 1/5 | ~10% | Mostly validates input and returns an external search/report URL. | No first-party data extraction or enrichment occurs. | Either relabel honestly or rebuild behind a real provider adapter. | Technically trivial to host, commercially thin. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |

## Template/Asset URL Builder Routes

| Endpoint | Promise | Strength | Coverage | Current Logic | Biggest Gap | Best-Ever Upgrade | Free-Tier Fit | GitHub Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/v1/seo-tools/open-graph-image-generator` | Dynamic OG image generation. | 1/5 | ~10% | Builds a dummyimage.com URL instead of rendering assets in DataLens. | No first-party rendering pipeline or artifact storage. | Move into a real image-generation suite with templates and storage. | Cheap to host, but incomplete. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |

## Queued Placeholder Routes

| Endpoint | Promise | Strength | Coverage | Current Logic | Biggest Gap | Best-Ever Upgrade | Free-Tier Fit | GitHub Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/v1/seo-tools/ga4-mcp` | GA4 analysis via MCP. | 1/5 | ~5% | Returns queued/pending placeholder responses only. | No job system, artifact store, or worker exists behind the response. | Do not expose publicly until the async platform exists. | Not launch-ready on free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/seobility-ranking-seo` | SEO analysis + ranking. | 1/5 | ~5% | Returns queued/pending placeholder responses only. | No job system, artifact store, or worker exists behind the response. | Do not expose publicly until the async platform exists. | Not launch-ready on free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/similar-app-store-applications-finder` | Find related apps for discovery. | 1/5 | ~5% | Returns queued/pending placeholder responses only. | No job system, artifact store, or worker exists behind the response. | Do not expose publicly until the async platform exists. | Not launch-ready on free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/snapify-capture-screenshot-save-pdf` | Full-page screenshots + PDFs. | 3/5 | ~40% | Real async job submission plus live HTML evidence capture and persisted report artifacts. | Still no rendered screenshot or PDF binary generation. | Keep evidence-capture mode as fallback and add real browser/PDF rendering in the worker. | Not launch-ready on free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/top-1000-websites-worldwide-country-level` | Top 1000 websites by country. | 1/5 | ~5% | Returns queued/pending placeholder responses only. | No job system, artifact store, or worker exists behind the response. | Do not expose publicly until the async platform exists. | Not launch-ready on free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/trayvmy-actor` | Generic automation actor. | 1/5 | ~5% | Returns queued/pending placeholder responses only. | No job system, artifact store, or worker exists behind the response. | Do not expose publicly until the async platform exists. | Not launch-ready on free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/woorank` | Full SEO analysis with Woorank. | 1/5 | ~5% | Returns queued/pending placeholder responses only. | No job system, artifact store, or worker exists behind the response. | Do not expose publicly until the async platform exists. | Not launch-ready on free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |
| `/api/v1/seo-tools/youtube-rank-checker` | Check video ranks by keyword. | 3/5 | ~45% | Real async job submission plus lightweight YouTube search evidence parsing with deterministic fallback. | Current parsing path is fragile and degrades to simulation when live evidence is unavailable. | Promote into a canonical rank-tracker family with retries, provenance, and hardened evidence capture. | Not launch-ready on free hosting. | No route-specific GitHub delta observed beyond the repo-wide branch lag. |

