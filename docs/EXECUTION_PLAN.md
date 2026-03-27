# DataLens API Step-by-Step Implementation Plan

## Goal

Turn the forensic audit into a real delivery roadmap for `DataLensAPI`, starting with platform fixes, then canonical API families, and finally ToolNexus onboarding.

This plan assumes we will **not** implement the raw backlog one ticket = one endpoint. We will first merge duplicate ideas into canonical API families, then build a shared runtime that lets those families ship safely and consistently.

## What This Plan Covers

- All accepted suggestions from the forensic report.
- Platform work required before large-scale API import.
- Delivery order for Wave 1, Wave 2, and selective Wave 3 families.
- How to prepare DataLens outputs for ToolNexus integration.
- Exit criteria for each phase so implementation does not drift.

## Delivery Rules

1. Build **platform first**, not endpoint first.
2. Group duplicate tickets into **canonical API families**.
3. Split work into `gateway-light` and `async-heavy` execution paths.
4. Keep public contracts stable from the first release.
5. Make every launch family ToolNexus-ready from day one.
6. Exclude risky traffic, fake engagement, and fake-view tools from the public roadmap.

## Phase Order

1. Lock scope and governance.
2. Build the platform foundation.
3. Build the shared provider and execution runtime.
4. Build ToolNexus compatibility and import packaging.
5. Ship Wave 1 families.
6. Ship Wave 2 families.
7. Review and selectively ship Wave 3 families.
8. Stabilize, monitor, and expand.

## Phase 0: Lock Scope and Governance

### Objective

Freeze the real product scope before engineering expands the codebase.

### Steps

1. Convert the raw backlog into the canonical family list from `docs/reports/2026-03-26-api-family-implementation-plan.csv`.
2. Mark each family as one of:
   - `build-now`
   - `build-after-foundation`
   - `build-later`
   - `template-only`
   - `do-not-add`
3. Create a backlog registry document with one row per canonical family.
4. Publish the official naming rules:
   - short public API name
   - stable family slug
   - stable endpoint slug
   - SEO title
   - SEO description
5. Lock the public category taxonomy:
   - `seo-tools`
   - `developer-tools`
   - `market-intelligence`
   - `public-connectors`
   - `content-tools`
6. Freeze the v1 response envelope and async job contract.
7. Publish the public reject list for risky tools.
8. Assign technical ownership by workstream:
   - API gateway
   - scraping runtime
   - provider adapters
   - ToolNexus integration
   - QA and contract testing

### Deliverables

- Canonical backlog registry.
- Public naming and slugging convention.
- Approved response contract v1.
- Approved reject/defer policy.
- Ownership map by workstream.

### Exit Criteria

- No new endpoint is started from the raw ticket list directly.
- Every future build request maps to a canonical family first.
- The team agrees which families are out of scope for launch.

## Phase 1: Platform Foundation

### Objective

Fix the repo gaps that currently make the API scaffold unsafe for large-scale rollout.

### Step 1.1: Shared Request and Response Schemas

1. Add a schema package or extend `packages/shared-types` for:
   - request metadata
   - validation errors
   - response envelope
   - pagination
   - async job descriptors
2. Add strict request validation for all new routes.
3. Normalize common fields across families:
   - `urls`
   - `keyword`
   - `keywords`
   - `country`
   - `language`
   - `device`
   - `limit`
   - `mode`
   - `profile`

### Step 1.2: Route Wrapper Standardization

1. Upgrade the shared wrapper in `packages/scraping-core`.
2. Add:
   - `request_id`
   - `tool_version`
   - `source`
   - `warnings`
   - optional `job`
   - optional `pagination`
3. Ensure error responses use machine-readable codes.
4. Make route handlers thin and move logic into reusable services.

### Step 1.3: Policy Layer

1. Create a per-tool policy definition model.
2. Add support for:
   - timeout budget
   - max input size
   - max URL count
   - anonymous/public access
   - auth-required access
   - allowed output modes
   - cache TTL
3. Set the default lightweight timeout to `10s`.
4. Route long-running jobs to async execution instead of stretching the ingress timeout.

### Step 1.4: Auth and Abuse Controls

1. Add API key middleware for protected families.
2. Add IP and API-key rate limiting.
3. Add per-tool concurrency controls.
4. Add public vs private tool flags.
5. Log quota and rejection events.

### Step 1.5: Testing and Observability

1. Add route contract tests for the shared response envelope.
2. Add request validation tests for common failure modes.
3. Add smoke tests for representative route families.
4. Add structured logs with request id propagation.
5. Add basic metrics for:
   - success rate
   - timeout rate
   - validation failures
   - provider failures
   - cache hit rate

### Deliverables

- Shared schema layer.
- Shared wrapper v2.
- Policy configuration system.
- Auth and rate limit middleware.
- Contract-test harness.
- Structured logging and metrics.

### Repo Areas

- `packages/shared-types`
- `packages/scraping-core/src`
- `apps/api-gateway/app/api`
- `apps/api-gateway` middleware and config

### Exit Criteria

- New routes cannot bypass validation and policy checks.
- All new public responses match the v1 envelope.
- Lightweight routes enforce the 10-second rule.

## Phase 2: Shared Provider and Execution Runtime

### Objective

Build reusable internals so canonical families share infrastructure instead of duplicating logic.

### Step 2.1: Provider Adapter Layer

1. Add provider modules for:
   - raw HTML fetch
   - HTML parsing and extraction
   - crawl and sitemap discovery
   - search suggestions
   - SERP data
   - performance and lighthouse providers
   - DNS and domain intelligence
   - file and PDF rendering
2. Define a normalized output contract per provider type.
3. Keep vendor-specific fields inside nested `provider_details` objects.

### Step 2.2: Caching and Storage

1. Add short-term cache support for public, repeatable lookups.
2. Add durable artifact storage for:
   - PDF files
   - screenshots
   - HTML reports
   - generated sitemaps
3. Add result snapshot storage for tracking-style tools.

### Step 2.3: Async Job System

1. Define a `Job` model with:
   - `id`
   - `family`
   - `status`
   - `created_at`
   - `started_at`
   - `finished_at`
   - `artifact_urls`
   - `error`
2. Add status endpoints such as `/api/v1/jobs/{id}`.
3. Route heavy tasks into the scraper service or worker execution path.
4. Add retry, timeout, and failure-reason handling.

### Step 2.4: Scraper Service Upgrade

1. Replace the placeholder `apps/scraper-service/index.js` with a real worker entrypoint.
2. Add health endpoints for the worker.
3. Add job execution handlers for:
   - browser-based audits
   - crawl jobs
   - report and artifact generation
4. Add result callback or shared storage write-back.

### Deliverables

- Provider adapter layer.
- Cache and artifact storage integration.
- Async job model and status API.
- Real scraper worker service.

### Repo Areas

- `packages/scraping-core/src/providers`
- `packages/scraping-core/src/services`
- `apps/scraper-service`
- `apps/api-gateway/app/api/v1/jobs`

### Exit Criteria

- Heavy jobs no longer return placeholder delegated responses.
- Reusable provider adapters are used by more than one family.
- Artifact-heavy routes return durable file links.

## Phase 3: ToolNexus Compatibility Layer

### Objective

Make DataLens families importable into ToolNexus without rethinking contracts later.

### Steps

1. Create a ToolNexus mapping file for each launch family:
   - family slug
   - ToolNexus slug
   - title
   - category
   - action list
   - SEO title
   - SEO description
   - sample input
   - public/private policy
2. For every Wave 1 family, define the ToolNexus execution shape:
   - ToolNexus `input`
   - DataLens upstream request
   - normalized output summary
3. Publish integration notes covering:
   - manifest entry
   - executor registration
   - action routing
   - ToolShell display expectations
4. Keep browser UI logic in ToolNexus and server-side execution in DataLens.
5. Add response shaping rules so ToolNexus can summarize outputs consistently.

### Deliverables

- ToolNexus mapping package.
- Family-specific manifest metadata.
- Execution bridge documentation.
- Shared examples for request and response translation.

### Exit Criteria

- A ToolNexus engineer can onboard any Wave 1 family using the mapping docs without re-discovering contracts.
- Every Wave 1 family has a ready slug, description, and sample payload.

## Phase 4: Wave 1 Implementation

### Objective

Ship the highest-value, lowest-risk launch families first.

### Wave 1 Families

1. `keyword-density-and-presence-audit`
2. `search-suggestions-explorer`
3. `keyword-research-suite`
4. `site-audit-suite`
5. `meta-tags-audit`
6. `headings-audit`
7. `image-seo-audit`
8. `performance-audit-suite`
9. `link-health-monitor`
10. `sitemap-suite`
11. `domain-intelligence-suite`
12. `tech-stack-detector-suite`
13. `qr-code-studio`
14. `pdf-conversion-suite`

### Implementation Sequence Inside Wave 1

#### Batch A: Lightweight SEO primitives

1. `meta-tags-audit`
2. `headings-audit`
3. `keyword-density-and-presence-audit`
4. `image-seo-audit`

Reason:
- They are fast to implement.
- They validate the new response and policy model.
- They create reusable parsing utilities for later suites.

#### Batch B: Search and intelligence primitives

1. `search-suggestions-explorer`
2. `keyword-research-suite`
3. `domain-intelligence-suite`
4. `tech-stack-detector-suite`

Reason:
- They benefit heavily from the provider adapter layer.
- They are ToolNexus-friendly and commercially useful.

#### Batch C: Crawl and audit products

1. `link-health-monitor`
2. `sitemap-suite`
3. `site-audit-suite`

Reason:
- They depend on crawl normalization, caching, and issue-code design.

#### Batch D: Heavy output and artifact tools

1. `performance-audit-suite`
2. `qr-code-studio`
3. `pdf-conversion-suite`

Reason:
- They exercise artifact storage and async job behavior.

### Step-by-Step Build Pattern for Each Family

1. Finalize the family contract.
2. Add request schema.
3. Add response schema.
4. Add policy profile.
5. Build or attach provider adapters.
6. Implement the service layer.
7. Add the route.
8. Add contract tests.
9. Add sample request and sample response docs.
10. Add ToolNexus mapping metadata.
11. Run smoke verification.
12. Mark family ready for import.

### Deliverables

- Four Wave 1 batches completed in order.
- Public API examples for each family.
- ToolNexus-ready launch package for each family.

### Exit Criteria

- All Wave 1 families pass contract tests.
- ToolNexus metadata exists for each Wave 1 family.
- No Wave 1 family depends on route-local custom behavior that bypasses the platform foundation.

## Phase 5: Wave 2 Implementation

### Objective

Build the higher-complexity families after the runtime is proven.

### Wave 2 Families

1. `seo-content-optimizer`
2. `rank-tracker-suite`
3. `authority-metrics-suite`
4. `accessibility-audit-suite`
5. `serp-search-intelligence`
6. `google-indexing-suite`
7. `maps-intelligence-suite`
8. `jobs-intelligence-suite`
9. `company-enrichment-suite`
10. `image-optimization-suite`
11. `text-analysis-suite`
12. `tech-debt-analysis`

### Sequence

1. Start with `authority-metrics-suite`, `image-optimization-suite`, and `text-analysis-suite`.
2. Then ship `serp-search-intelligence` and `jobs-intelligence-suite`.
3. Then ship `rank-tracker-suite` and `seo-content-optimizer`.
4. Then ship `accessibility-audit-suite`, `maps-intelligence-suite`, and `google-indexing-suite`.
5. Build `tech-debt-analysis` only after deciding whether it stays in the same runtime or becomes its own worker service.

### Special Rules

- Anything historical or scheduled should persist snapshots from the beginning.
- Anything browser-heavy should use async job execution.
- Anything credentialed should require auth and stronger audit logs.

### Exit Criteria

- Wave 2 families reuse shared providers instead of inventing new one-off routes.
- Historical tools have snapshot storage.
- Sensitive and credentialed flows have auditable access controls.

## Phase 6: Selective Wave 3 and Templates

### Objective

Only ship later families if they have clear product value and low legal or maintenance risk.

### Build-Later Candidates

- `linkedin-people-posts-intelligence`
- `travel-rental-intelligence`
- `market-data-prices-suite`
- `analytics-mcp-suite`
- `speech-suite`
- `discord-web-publisher-suite`
- `website-traffic-intelligence-suite`
- `website-security-suite`
- `youtube-channel-intelligence`
- `app-store-market-intelligence`

### Template-Only Candidates

- `marketplace-review-intelligence`
- `public-knowledge-base-connector`
- `generic-public-connector-template`

### Rules

1. Do not ship a Wave 3 family unless Wave 1 is stable in production.
2. Run a legal and abuse review before onboarding new social, traffic, or browser-intensive providers.
3. Prefer templates when the family is low differentiation and high maintenance.

### Exit Criteria

- Later families are added selectively, not automatically.
- Low-value providers are onboarded through templates, not bespoke product work.

## Phase 7: Explicit Exclusions

### Do Not Add to the Public Roadmap

- website traffic generators
- fake engagement tools
- fake view generators
- manipulative load simulators presented as growth tools

### Reason

These tools create legal, trust, abuse, and ecosystem risk that is much higher than their product value.

## Phase 8: QA, Release, and Operations

### Pre-Release Checklist for Every Family

1. Contract test passes.
2. Validation test passes.
3. Timeout and policy settings are defined.
4. Error codes are documented.
5. Sample requests and responses are published.
6. ToolNexus mapping is complete.
7. Logging and metrics are confirmed.
8. Abuse review is complete if the source is sensitive.

### Release Gates

1. Foundation gate:
   - schema layer
   - policy layer
   - auth
   - rate limiting
   - async job support
2. Wave 1 gate:
   - first fourteen launch families complete
3. Wave 2 gate:
   - advanced families only after shared runtime is stable
4. Expansion gate:
   - later families only after stability and legal review

### Operational Metrics

- request volume by family
- median and p95 execution time
- timeout count
- cache hit rate
- provider failure rate
- job success rate
- artifact generation success rate
- ToolNexus import adoption rate

## Recommended Sprint Structure

### Sprint 1

- Phase 0 complete.
- Response contract locked.
- Backlog registry published.

### Sprint 2

- Shared schemas and wrapper v2.
- Policy layer.
- Contract-test skeleton.

### Sprint 3

- Auth and rate limiting.
- Provider adapter skeletons.
- Async job model.

### Sprint 4

- Real scraper worker.
- Cache and artifact storage.
- ToolNexus mapping scaffolds.

### Sprint 5

- Wave 1 Batch A.

### Sprint 6

- Wave 1 Batch B.

### Sprint 7

- Wave 1 Batch C.

### Sprint 8

- Wave 1 Batch D.
- ToolNexus import for all Wave 1 families.

### Sprint 9+

- Wave 2 rollout based on dependency readiness and production learnings.

## Definition of Done

A family is only complete when:

1. It has a canonical contract and stable endpoint.
2. It uses shared validation and response handling.
3. It follows the policy layer.
4. It has contract tests and sample payloads.
5. It is documented for ToolNexus import.
6. It is safe to operate under the public roadmap rules.

## Recommended Immediate Next Actions

1. Create the canonical backlog registry from the CSV report.
2. Implement the shared response envelope v2.
3. Add request schema validation for all new routes.
4. Add the policy layer with 10-second lightweight timeouts.
5. Replace scraper-service placeholder code with a real job worker skeleton.
6. Build Wave 1 Batch A first.
7. Prepare ToolNexus mapping files while Wave 1 is being built.

## Reference Inputs

- `docs/reports/2026-03-26-api-forensic-implementation-plan.md`
- `docs/reports/2026-03-26-api-family-implementation-plan.csv`
- `docs/reports/2026-03-26-datalens-repo-forensic-findings.csv`
- `docs/reports/2026-03-26-toolnexus-integration-contract.csv`
