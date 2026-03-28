# Repository Strategy (Current)

_Last reconciled: 2026-03-28_

## Strategic Principle

Prioritize a maintainable, truthful API surface over catalog size claims.

## What We Optimize For

- Clear route ownership in the filesystem.
- Explicit allowlist documentation.
- Fast reconciliation when planning docs drift from implemented routes.
- Incremental evolution instead of preserving stale endpoint narratives.

## Operational Rule

A route is considered part of the product surface only if it exists in `apps/api-gateway/app/api/v1/**/route.ts` and appears in `docs/api-plans/route-allowlist.md`.
