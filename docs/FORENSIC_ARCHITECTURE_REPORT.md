# Forensic Architecture Report (Current State)

_Last reconciled: 2026-03-28_

## Executive Summary

The repository currently operates as a **single Next.js API gateway workspace** with route handlers discovered from the filesystem. It is **not** a 50-independent-microservice deployment.

## Source-of-Truth Rules

1. **Route existence:** `apps/api-gateway/app/api/v1/**/route.ts`
2. **Published allowlist:** `docs/api-plans/route-allowlist.md`
3. **Planning inventory:** `docs/api-plans/dev-and-seo-tooling-list.md` (must match allowlist status)
4. **Drift audit:** `docs/reports/2026-03-28-deep-api-forensic-analysis.md`

## Runtime Topology

- `apps/api-gateway`: Next.js App Router API routes and public API surface.
- `packages/scraping-core`: shared envelope, request validation, launch policy, observability context, and route-family utilities.
- `apps/scraper-service`: heavyweight worker target for future async-heavy families.
- Root workspace scripts: Turborepo-driven build/test orchestration.

## Public route families (maintained patterns)

- **Audit** (`seo-audit-tool`, `seo-report-generator`): page-level structured SEO checks.
- **Keyword discovery** (`search-keyword-research`, `*-keywords-discovery-tool`): provider-backed suggestion discovery.
- **Domain intelligence** (`domain-checker`, `domain-inspector`, DNS lookup route): DNS/availability-oriented outputs.
- **Async jobs** (`youtube-rank-checker`, `/api/v1/jobs/:jobId`, `/api/v1/jobs/:jobId/artifacts/:artifactId`): queue-first lifecycle for heavier workflows.

## Observability and contract model

- Every route response returns the shared envelope and carries `metadata.request_id` plus `x-request-id` response headers.
- Shared envelope timing now uses a monotonic clock for `metadata.execution_time_ms`, so response timing stays non-negative even if the wall clock shifts during execution.
- Error payloads are machine-readable via `error.code` (`validation_error`, `upstream_api_error`, `bad_request`, etc.).
- API handler wrapper emits structured lifecycle logs (`api.request.started`, `api.request.completed`, `api.request.failed`).
- Shared HTTP client emits provider timing/failure logs (`provider.request.started`, `provider.request.completed`, `provider.request.failed`) using the same monotonic duration path.

## QA loops and regression protection

- Contract tests: envelope shape + validation semantics.
- Smoke tests: representative live routes from audit, keyword, domain, and async-job families.
- Regression tests: canonical family behavior for high-signal helper/link-builder routes.

## Governance

- Any PR that adds/removes a route file must also update:
  - `docs/api-plans/route-allowlist.md`
  - `docs/api-plans/dev-and-seo-tooling-list.md` (`Created` status)
  - drift report (if reconciliation is part of the change)

## Deprecated Narrative

Prior documentation describing a fixed “50-tool” or “50 microservice” system is historical context only and is no longer architectural truth.
