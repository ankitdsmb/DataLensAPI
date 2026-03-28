# Deep API Forensic Analysis (GitHub-First Reconciliation)

Date: 2026-03-28

## Scope

- Reconcile route inventory with the current repository state.
- Compare local route tree against the planning allowlist in `dev-and-seo-tooling-list.md`.
- Remove ambiguity for endpoints historically marked as created but absent from current route files.

## Canonical Truth Decision

**Canonical source of truth for route existence:** filesystem route tree under `apps/api-gateway/app/api/v1/**/route.ts`, materialized in `docs/api-plans/route-allowlist.md`.

Rationale: this matches executable code and build output. Planning documents may lead or lag implementation.

## Reconciliation Results

- Local implemented routes: **149**
- Rows marked `Created = Yes` in planning table: **165**
- Drift (`Created=Yes` but no local route file): **14**
- Drift (local route exists but not marked `Created=Yes`): **0**

### Drift: marked created but missing route file

- `/api/v1/seo-tools/complete-seo-audit-tool-comprehensive-website-seo-analysis`
- `/api/v1/seo-tools/discord-forum-to-website`
- `/api/v1/seo-tools/discord-website-generator`
- `/api/v1/seo-tools/keyword-density-checker`
- `/api/v1/seo-tools/meta-tags-check-api`
- `/api/v1/seo-tools/moz-domain-authority-checker`
- `/api/v1/seo-tools/quick-lh`
- `/api/v1/seo-tools/seo-image-audit-tool-analyze-optimize-website-images`
- `/api/v1/seo-tools/seobility-keyword-research-rental-unlimited-seo`
- `/api/v1/seo-tools/simple-http-status-code-checker`
- `/api/v1/seo-tools/simple-seo-auditor-plus`
- `/api/v1/seo-tools/sitemap-generator`
- `/api/v1/seo-tools/sitepulse`
- `/api/v1/seo-tools/website-traffic-analysis`

### Drift: local route exists but not marked created

- None.

## Actions Applied in This Reconciliation

1. Added canonical route allowlist document generated from route files.
2. Updated planning table status for all missing route files listed above from `Created = Yes` to `Created = No`.
3. Updated architecture and README docs to remove stale “50-tool system” claims and describe the repository as route-file-driven.
4. Added this drift report so future diffs can be reconciled quickly.

## Forward Rule

When route status drifts again, update code first, regenerate `route-allowlist.md`, then sync planning and architecture docs in the same PR.
