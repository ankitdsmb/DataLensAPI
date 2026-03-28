# DataLensAPI

DataLensAPI is a monorepo for a Next.js API gateway that exposes route handlers under `apps/api-gateway/app/api/v1`.

## Current System Truth (2026-03-28)

- Route existence is defined by route files (`route.ts`) in `apps/api-gateway/app/api/v1/**`.
- The canonical allowlist is maintained in `docs/api-plans/route-allowlist.md`.
- The planning catalog in `docs/api-plans/dev-and-seo-tooling-list.md` is advisory and must be reconciled to the allowlist.
- The reconciliation and drift analysis is documented in `docs/reports/2026-03-28-deep-api-forensic-analysis.md`.

## Repository Layout

- `apps/api-gateway` – Next.js App Router API service.
- `packages/scraping-core` – shared request/response and validation utilities.
- `docs/` – architecture, plans, and reconciliation artifacts.

## Development

```bash
npm install
npm run build
npm run dev
```

## Documentation Index

- Canonical route allowlist: `docs/api-plans/route-allowlist.md`
- Route planning table: `docs/api-plans/dev-and-seo-tooling-list.md`
- Drift report: `docs/reports/2026-03-28-deep-api-forensic-analysis.md`
- Architecture overview: `docs/FORENSIC_ARCHITECTURE_REPORT.md`
