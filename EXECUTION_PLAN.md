# DataLens API Execution Plan (Step-by-Step)

## Objective
Deliver DataLens as a stable, scalable API platform by sequencing work in this order:
1) governance and scope, 2) platform foundation, 3) shared runtime, 4) ToolNexus compatibility, and 5) canonical API-family rollout.

## Delivery Rules (Non-Negotiable)
1. Build platform capabilities before adding many endpoints.
2. Implement canonical API families (not raw-ticket one-off routes).
3. Split execution paths into `gateway-light` (fast sync) and `async-heavy` (job-based).
4. Keep response contracts stable from first public release.
5. Make launch families ToolNexus-ready at ship time.
6. Exclude risky abuse-oriented tool categories from the public roadmap.

---

## Phase 0 — Scope Lock and Governance

### Goal
Freeze what will and will not be built before engineering expansion.

### Steps
1. Convert the raw forensic backlog into canonical families using `docs/reports/2026-03-26-api-family-implementation-plan.csv`.
2. Assign each family one status: `build-now`, `build-after-foundation`, `build-later`, `template-only`, or `do-not-add`.
3. Publish a single backlog registry (one row per canonical family).
4. Lock naming conventions for public name, family slug, endpoint slug, SEO title, SEO description.
5. Lock public categories: `seo-tools`, `developer-tools`, `market-intelligence`, `public-connectors`, `content-tools`.
6. Freeze v1 response envelope and async job contract.
7. Publish reject list for risky classes (fake engagement, fake traffic, fake views, manipulative simulators).
8. Assign technical owners by workstream (gateway, scraping runtime, provider adapters, ToolNexus integration, QA/contracts).

### Exit Criteria
- No endpoint work starts directly from raw tickets.
- Every request maps to a canonical family first.
- Out-of-scope families are explicitly approved.

---

## Phase 1 — Platform Foundation

### Goal
Create shared contracts, enforcement, and controls so all new families are safe by default.

### Steps
1. Extend shared schemas in `packages/shared-types`:
   - request metadata
   - validation error model
   - response envelope
   - pagination
   - async job descriptors
2. Add strict request validation for every new route.
3. Standardize common input fields: `urls`, `keyword`, `keywords`, `country`, `language`, `device`, `limit`, `mode`, `profile`.
4. Upgrade shared wrapper in `packages/scraping-core` to include:
   - `request_id`
   - `tool_version`
   - `source`
   - `warnings`
   - optional `job`
   - optional `pagination`
5. Ensure error payloads use machine-readable error codes.
6. Add tool policy model with:
   - timeout budget
   - max input size
   - max URL count
   - public vs auth-required access
   - allowed output modes
   - cache TTL
7. Set default lightweight timeout to 10 seconds.
8. Route long-running jobs to async instead of increasing gateway timeouts.
9. Add API key auth for protected families.
10. Add IP/API-key rate limiting and per-tool concurrency limits.
11. Add public/private visibility flags for tools.
12. Add contract tests + validation tests + smoke tests.
13. Add structured logging and metrics: success, timeout, validation failures, provider failures, cache hit rate.

### Exit Criteria
- New routes cannot bypass validation/policy.
- All responses conform to v1 envelope.
- Lightweight routes enforce the 10s rule.

---

## Phase 2 — Shared Provider and Execution Runtime

### Goal
Implement reusable internals so families reuse providers/services instead of duplicating scraper code.

### Steps
1. Build provider adapter layer for:
   - HTML fetch
   - HTML parse/extract
   - crawl/sitemap discovery
   - search suggestions
   - SERP data
   - performance/lighthouse
   - DNS/domain intelligence
   - file/PDF rendering
2. Define normalized contracts per provider type.
3. Keep provider-specific fields under `provider_details`.
4. Add short-term caching for repeatable public lookups.
5. Add durable artifact storage for PDFs, screenshots, HTML reports, generated sitemaps.
6. Add snapshot storage for tracking/historical tools.
7. Define async `Job` model (`id`, `family`, `status`, timestamps, `artifact_urls`, `error`).
8. Add status endpoint family (e.g., `/api/v1/jobs/{id}`).
9. Add retries, timeout handling, and failure reason taxonomy.
10. Replace placeholder `apps/scraper-service/index.js` with a real worker entrypoint.
11. Add worker health endpoints and heavy-job handlers.
12. Add write-back/callback from worker to shared result storage.

### Exit Criteria
- Heavy routes no longer return placeholder delegated responses.
- Shared provider adapters power multiple families.
- Artifact-producing families return durable URLs.

---

## Phase 3 — ToolNexus Compatibility Layer

### Goal
Make Wave 1 families importable into ToolNexus without contract rework.

### Steps
1. Create per-family ToolNexus mapping metadata:
   - family slug, ToolNexus slug, title, category, actions
   - SEO title/description
   - sample input
   - public/private policy
2. Define execution shape per Wave 1 family:
   - ToolNexus `input`
   - DataLens request transform
   - normalized response summary
3. Publish onboarding docs: manifest, executor registration, action routing, ToolShell UI expectations.
4. Keep UI concerns in ToolNexus and execution in DataLens.
5. Add response shaping conventions for consistent ToolNexus summaries.

### Exit Criteria
- Any Wave 1 family can be onboarded via docs only.
- Every Wave 1 family has slug, metadata, and sample payloads ready.

---

## Phase 4 — Wave 1 Family Delivery

### Goal
Ship highest-value / lowest-risk families first.

### Family Batches (in order)
- **Batch A (SEO primitives):** `meta-tags-audit`, `headings-audit`, `keyword-density-and-presence-audit`, `image-seo-audit`
- **Batch B (search/intelligence):** `search-suggestions-explorer`, `keyword-research-suite`, `domain-intelligence-suite`, `tech-stack-detector-suite`
- **Batch C (crawl/audit):** `link-health-monitor`, `sitemap-suite`, `site-audit-suite`
- **Batch D (artifact-heavy):** `performance-audit-suite`, `qr-code-studio`, `pdf-conversion-suite`

### Per-Family Build Checklist
1. Finalize contract.
2. Add request schema.
3. Add response schema.
4. Add policy profile.
5. Attach provider adapter(s).
6. Implement service layer.
7. Add route handler.
8. Add contract tests.
9. Publish sample request/response.
10. Add ToolNexus mapping metadata.
11. Run smoke verification.
12. Mark family import-ready.

### Exit Criteria
- All 14 Wave 1 families pass contracts.
- ToolNexus metadata exists for each family.
- No route-local bypass of shared platform controls.

---

## Phase 5 — Wave 2 Family Delivery

### Goal
Ship advanced families after runtime stability is proven.

### Sequence
1. `authority-metrics-suite`, `image-optimization-suite`, `text-analysis-suite`
2. `serp-search-intelligence`, `jobs-intelligence-suite`
3. `rank-tracker-suite`, `seo-content-optimizer`
4. `accessibility-audit-suite`, `maps-intelligence-suite`, `google-indexing-suite`
5. `tech-debt-analysis` after runtime-placement decision

### Additional Rules
- Historical/scheduled families must store snapshots from day one.
- Browser-heavy workloads must run async.
- Credentialed families must require auth + stronger audit logging.

### Exit Criteria
- Shared providers are reused across Wave 2.
- Snapshot storage is enabled where required.
- Sensitive flows are auditable.

---

## Phase 6 — Selective Wave 3 and Template Strategy

### Goal
Ship only if value is clear and legal/abuse risk is acceptable.

### Steps
1. Gate all Wave 3 candidates behind production stability from Wave 1.
2. Run legal + abuse reviews before social/traffic/browser-intensive sources.
3. Prefer template-only onboarding for low-differentiation/high-maintenance families.

### Exit Criteria
- Wave 3 is selective, not automatic.
- Low-value families handled via templates where possible.

---

## Phase 7 — QA, Release Gates, and Operations

### Pre-Release Checklist (Every Family)
1. Contract tests pass.
2. Validation tests pass.
3. Timeout/policy profile defined.
4. Error codes documented.
5. Sample request/response published.
6. ToolNexus mapping complete.
7. Logging + metrics confirmed.
8. Abuse review completed if source is sensitive.

### Release Gates
1. **Foundation Gate:** schemas, policy, auth, rate limits, async jobs.
2. **Wave 1 Gate:** all 14 launch families complete.
3. **Wave 2 Gate:** runtime stable before advanced families.
4. **Expansion Gate:** stability + legal review for later families.

### Core Operational Metrics
- Request volume by family
- Median and p95 latency
- Timeout rate
- Validation failure rate
- Provider failure rate
- Cache hit rate
- Job success rate
- Artifact generation success rate
- ToolNexus import adoption

---

## Sprint-by-Sprint Execution

- **Sprint 1:** Phase 0 scope lock + response contract freeze.
- **Sprint 2:** Shared schemas, wrapper v2, policy baseline, contract-test skeleton.
- **Sprint 3:** Auth, rate limits, provider adapter skeletons, async job model.
- **Sprint 4:** Scraper worker skeleton, cache/artifacts, ToolNexus mapping scaffolds.
- **Sprint 5:** Wave 1 Batch A.
- **Sprint 6:** Wave 1 Batch B.
- **Sprint 7:** Wave 1 Batch C.
- **Sprint 8:** Wave 1 Batch D + ToolNexus onboarding for all Wave 1.
- **Sprint 9+:** Wave 2 rollout based on production stability and dependencies.

---

## Immediate Next Actions (Start Now)
1. Build canonical backlog registry from the family CSV.
2. Implement shared response envelope v2.
3. Enforce request schema validation on all new routes.
4. Implement policy layer with default 10-second lightweight timeout.
5. Replace scraper-service placeholder with a real worker skeleton.
6. Begin Wave 1 Batch A.
7. Build ToolNexus mapping files in parallel with Wave 1.

## Source Inputs
- `docs/reports/2026-03-26-api-forensic-implementation-plan.md`
- `docs/reports/2026-03-26-api-family-implementation-plan.csv`
- `docs/reports/2026-03-26-datalens-repo-forensic-findings.csv`
- `docs/reports/2026-03-26-toolnexus-integration-contract.csv`
