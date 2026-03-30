# Safe Git Integration Sequence

Date: 2026-03-28

## Goal

Safely move from the current dirty local `main` branch to a clean branch based on `origin/main`, while preserving only the meaningful local forensic work.

## Current facts

- local branch: `main`
- local branch is behind `origin/main` by `20` commits
- tracked local modifications are effectively newline-only noise
- meaningful local files to preserve:
  - `docs/reports/2026-03-28-deep-api-forensic-analysis.md`
  - `docs/reports/2026-03-28-origin-main-integration-plan.md`
  - `docs/reports/2026-03-28-local-change-preservation-matrix.md`
  - `scripts/generate-deep-api-forensic-report.mjs`

## Recommended branch names

- snapshot branch: `codex/local-forensic-snapshot`
- integration branch: `codex/origin-main-integration`

## Safe execution sequence

Run these in order from `/mnt/c/docker/DataLensAPI/DataLensAPI`.

### 1. Create a snapshot branch for the current dirty state

```bash
git switch -c codex/local-forensic-snapshot
```

### 2. Stage only the meaningful local files

```bash
git add docs/reports/2026-03-28-deep-api-forensic-analysis.md
git add docs/reports/2026-03-28-origin-main-integration-plan.md
git add docs/reports/2026-03-28-local-change-preservation-matrix.md
git add scripts/generate-deep-api-forensic-report.mjs
```

### 3. Commit the preserved forensic work

```bash
git commit -m "docs: preserve local forensic analysis artifacts"
```

### 4. Return to `main`

```bash
git switch main
```

### 5. Discard the noisy tracked local modifications on `main`

This is safe only because the meaningful files were already preserved on the snapshot branch.

```bash
git restore .
```

### 6. Remove any remaining untracked forensic files from `main` if needed

Only run this if those files are still present on `main` after step 5.

```bash
git clean -fd docs/reports/2026-03-28-deep-api-forensic-analysis.md docs/reports/2026-03-28-origin-main-integration-plan.md docs/reports/2026-03-28-local-change-preservation-matrix.md scripts/generate-deep-api-forensic-report.mjs
```

### 7. Fast-forward local `main` to latest upstream

```bash
git pull --ff-only origin main
```

### 8. Create the clean integration branch from updated `main`

```bash
git switch -c codex/origin-main-integration
```

### 9. Replay only the preserved files from the snapshot branch

```bash
git checkout codex/local-forensic-snapshot -- docs/reports/2026-03-28-deep-api-forensic-analysis.md
git checkout codex/local-forensic-snapshot -- docs/reports/2026-03-28-origin-main-integration-plan.md
git checkout codex/local-forensic-snapshot -- docs/reports/2026-03-28-local-change-preservation-matrix.md
git checkout codex/local-forensic-snapshot -- scripts/generate-deep-api-forensic-report.mjs
```

### 10. Review whether each preserved file still belongs

Expected guidance:

- keep `2026-03-28-origin-main-integration-plan.md`
- keep `2026-03-28-local-change-preservation-matrix.md`
- keep the generator script, but refresh assumptions
- keep `2026-03-28-deep-api-forensic-analysis.md` only as historical baseline, not as latest truth

### 11. Regenerate forensic output against the integrated latest code

```bash
node scripts/generate-deep-api-forensic-report.mjs
```

### 12. Re-run the latest checks

```bash
npm run build --workspace=packages/shared-types
npm run build --workspace=packages/scraping-core
npm run build --workspace=apps/api-gateway
node scripts/contract-tests/envelope.mjs
```

## Safer alternative if you do not want to discard local tracked changes immediately

Instead of step 5 on `main`, do this:

```bash
git stash push -u -m "temporary-main-cleanup-before-origin-integration"
git pull --ff-only origin main
git switch -c codex/origin-main-integration
```

Then replay only the preserved files from the snapshot branch, not from the stash.

This is safer if you want the newline-only work preserved for inspection, but it is noisier.

## What not to do

Do not do these:

- `git pull` on dirty `main`
- `git merge origin/main` before preserving the meaningful files
- replay the line-ending-only tracked changes onto the integration branch
- treat the older local forensic report as canonical truth after integration

## Recommended immediate next action

If proceeding interactively, the safest next command is:

```bash
git switch -c codex/local-forensic-snapshot
```

That step is reversible, non-destructive, and protects the valuable local analysis before any cleanup.
