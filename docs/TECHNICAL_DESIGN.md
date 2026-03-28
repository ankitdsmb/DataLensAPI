# Technical Design (Living Baseline)

_Last reconciled: 2026-03-28_

## Purpose

This document defines the technical baseline for the currently deployed repository structure. It supersedes legacy content that treated the system as a fixed 50-tool catalog.

## Runtime Model

- Primary service: Next.js App Router API gateway in `apps/api-gateway`.
- Route handlers are file-based and discovered from `app/api/v1/**/route.ts`.
- Shared behavior is implemented in `packages/scraping-core`.

## Route Contract

- Routes use POST handlers unless otherwise justified by endpoint semantics.
- Response payloads should follow the shared JSON envelope pattern used by `scraping-core` utilities.
- Input validation should rely on shared validators where possible.

## Canonical Route Inventory

The canonical route inventory is maintained in:

- `docs/api-plans/route-allowlist.md`

Planning docs may include backlog candidates and must not be interpreted as deployed inventory unless the route exists in the allowlist.

## Reconciliation Workflow

When routes change:

1. Update route files in `apps/api-gateway/app/api/v1`.
2. Regenerate/sync `docs/api-plans/route-allowlist.md`.
3. Update `docs/api-plans/dev-and-seo-tooling-list.md` `Created` values.
4. Record notable drift in a report under `docs/reports/`.
