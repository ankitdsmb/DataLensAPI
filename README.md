# DataLensAPI

DataLensAPI is a monorepo for a Next.js API gateway that exposes route handlers under `apps/api-gateway/app/api/v1` and shared route infrastructure under `packages/scraping-core`.

## Current System Truth (2026-03-28)

- Route existence is defined by route files (`route.ts`) in `apps/api-gateway/app/api/v1/**`.
- The canonical allowlist is maintained in `docs/api-plans/route-allowlist.md`.
- The planning catalog in `docs/api-plans/dev-and-seo-tooling-list.md` is advisory and must be reconciled to the allowlist.
- The reconciliation and drift analysis is documented in `docs/reports/2026-03-28-deep-api-forensic-analysis.md`.

## Runtime architecture

- `apps/api-gateway` is the live HTTP surface and currently hosts all shipped v1 routes.
- `packages/scraping-core` owns the shared API envelope, validation layer, observability hooks, and family-level helpers.
- `apps/scraper-service` exists as the heavyweight execution target for routes that later outgrow gateway-only execution.

## Canonical live route families

The strongest actively maintained family patterns are:

- **Audit family:** e.g. `seo-audit-tool` / `seo-report-generator`.
- **Keyword family:** e.g. `search-keyword-research`, `google-play-keywords-discovery-tool`, `youtube-keywords-discovery-tool`.
- **Domain family:** e.g. `domain-checker`, `domain-inspector`, `dns-lookup-forward-and-reverse-a-mx-txt-dmarc-ptr`.
- **Async-job family:** job-producing routes such as `youtube-rank-checker`, plus `GET /api/v1/jobs/:jobId` and artifact retrieval routes.

## Hosting model

- **Gateway-light routes** are designed to run in the Next.js gateway runtime.
- **Heavy/long-running routes** are modeled as async jobs and can be promoted to the scraper-service runtime when needed.
- Public response envelopes remain stable across both hosting tiers to protect clients during refactors.

## Quality gates

```bash
npm run build
npm run contract-tests
npm run smoke-tests
npm run regression-tests
```

- Contract tests assert envelope and validation behavior.
- Smoke tests verify representative live routes across audit, keyword, domain, and async-job families.
- Regression tests lock canonical route-family behavior for helper-style live routes.

## Documentation index

- Canonical route allowlist: `docs/api-plans/route-allowlist.md`
- Route planning table: `docs/api-plans/dev-and-seo-tooling-list.md`
- Drift report: `docs/reports/2026-03-28-deep-api-forensic-analysis.md`
- Architecture overview: `docs/FORENSIC_ARCHITECTURE_REPORT.md`
