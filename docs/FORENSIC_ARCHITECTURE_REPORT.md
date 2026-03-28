# Forensic Architecture Report (Current State)

_Last reconciled: 2026-03-28_

## Executive Summary

The repository currently operates as a **single Next.js API gateway workspace** with route handlers discovered from the filesystem. It is **not** a 50-independent-microservice deployment.

## Source-of-Truth Rules

1. **Route existence:** `apps/api-gateway/app/api/v1/**/route.ts`
2. **Published allowlist:** `docs/api-plans/route-allowlist.md`
3. **Planning inventory:** `docs/api-plans/dev-and-seo-tooling-list.md` (must match allowlist status)
4. **Drift audit:** `docs/reports/2026-03-28-deep-api-forensic-analysis.md`

## Current Topology

- `apps/api-gateway`: Next.js App Router API routes.
- `packages/scraping-core`: shared validation and handler utilities.
- Root workspace scripts use Turborepo for build/lint/test orchestration.

## Governance

- Any PR that adds/removes a route file must also update:
  - `docs/api-plans/route-allowlist.md`
  - `docs/api-plans/dev-and-seo-tooling-list.md` (`Created` status)
  - drift report (if reconciliation is part of the change)

## Deprecated Narrative

Prior documentation describing a fixed “50-tool” or “50 microservice” system is historical context only and is no longer architectural truth.
