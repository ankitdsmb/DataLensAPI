# Local Change Preservation Matrix

Date: 2026-03-28

## Purpose

This note identifies which current local changes should be preserved before integrating the latest upstream `origin/main`.

## Summary judgment

### Preserve

These are the meaningful local artifacts that should be carried forward:

1. `docs/reports/2026-03-28-deep-api-forensic-analysis.md`
2. `docs/reports/2026-03-28-origin-main-integration-plan.md`
3. `scripts/generate-deep-api-forensic-report.mjs`

### Do not preserve as code changes

The tracked modifications currently present in the working tree appear to be newline / line-ending rewrites rather than intentional product or architecture work.

Evidence:

- `git diff --stat HEAD` shows huge churn with matched insert/delete counts.
- Representative diffs in:
  - `README.md`
  - `package.json`
  - `apps/scraper-service/index.js`
  - `docs/TECHNICAL_DESIGN.md`
  show content-equivalent changes with line-ending flips, not logical edits.

Conclusion:

- these tracked modifications should **not** be replayed onto the integration branch
- they should be discarded or normalized after the meaningful untracked files are preserved

## Local change classification

### A. Meaningful local files

| File | Keep? | Why |
| --- | --- | --- |
| `docs/reports/2026-03-28-deep-api-forensic-analysis.md` | Yes | Useful forensic baseline from pre-upstream snapshot |
| `docs/reports/2026-03-28-origin-main-integration-plan.md` | Yes | Current operational plan for safe upstream integration |
| `scripts/generate-deep-api-forensic-report.mjs` | Yes | Reusable generator for future forensic refreshes |

### B. Tracked worktree modifications

| Category | Keep? | Reason |
| --- | --- | --- |
| `.github/workflows/*` | No | Current diff appears formatting/newline-only |
| root docs and markdown files | No | Current diff appears formatting/newline-only |
| `package.json`, `package-lock.json`, `turbo.json` | No | Current diff appears formatting/newline-only |
| `apps/api-gateway/*` config files | No | Current diff appears formatting/newline-only |
| `apps/scraper-service/*` tracked files | No | Current diff appears formatting/newline-only |
| `packages/scraping-core/*` package/tsconfig files | No | Current diff appears formatting/newline-only |

## Recommended safe integration path

### Step 1

Preserve the three meaningful local files outside the risky dirty-tree merge path.

Options:

- commit them on a snapshot branch
- or copy/export them temporarily and restore after clean branch creation

### Step 2

Discard newline-only tracked changes before rebasing or replaying onto `origin/main`.

Rationale:

- carrying them forward will create noisy conflicts
- they add no product value
- they make forensic diff review much harder

### Step 3

Create a clean integration branch from `origin/main`.

### Step 4

Replay only the preserved meaningful files if they are still not superseded by upstream.

Important note:

- upstream already contains:
  - a later launch-readiness forensic pass
  - route-family refactors
  - job runtime
  - launch guard
  - observability

So local forensic material should be merged carefully as supporting analysis, not as competing architecture truth.

## Merge guidance for the preserved files

### `docs/reports/2026-03-28-deep-api-forensic-analysis.md`

Use as:

- historical baseline
- comparison document

Do not use as:

- canonical latest route-count truth after upstream integration

### `docs/reports/2026-03-28-origin-main-integration-plan.md`

Use as:

- current integration playbook
- operational sequencing note

### `scripts/generate-deep-api-forensic-report.mjs`

Use as:

- reusable internal tool

But validate it after integration because:

- upstream route counts changed
- upstream now includes jobs routes and new suite routes
- report assumptions may need refresh

## Final recommendation

Before any merge or rebase:

1. preserve the 3 meaningful local files
2. discard the newline-only tracked changes
3. branch from `origin/main`
4. replay only meaningful local artifacts
5. regenerate forensic docs against the integrated latest code
