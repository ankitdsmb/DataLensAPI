# Execution Plan for Forensic Analysis API Suite

## Objective
To build the foundational structure, Docker configuration, and CI/CD pipelines for a 50-tool open-source scraping monorepo, optimized for free hosting providers (Vercel and Render).

## Steps

### Step 1: Initialize Monorepo Structure
1.  **Root Configuration:**
    *   Create `package.json` for npm workspaces.
    *   Create `turbo.json` for task orchestration.
    *   Create `.gitignore` for standard Node.js projects.
2.  **Create Directories:**
    *   `apps/web-frontend/` (Next.js - placeholder)
    *   `apps/api-gateway/` (Next.js - placeholder)
    *   `apps/scraper-service/` (Express.js - placeholder)
    *   `packages/shared-types/`
    *   `packages/scraping-core/`
    *   `packages/logger/`

### Step 2: Configure Docker for Render's Free Tier
1.  **Create `apps/scraper-service/Dockerfile`**:
    *   Use a slim Node.js image (e.g., `node:18-bullseye-slim` or `node:20-bookworm-slim`).
    *   Install necessary OS-level dependencies for running Puppeteer/Chromium headlessly (e.g., `libxss1`, `libxtst6`, `libatk-bridge2.0-0`, `libnss3`, `fonts-liberation`, `libasound2`).
    *   Set up non-root user (e.g., `node`) for better security in production.
    *   Set the correct working directory (`/app`) and copy the `package.json` files and the required workspace dependencies.
    *   Expose port (e.g., `3000`).
2.  **Create `apps/scraper-service/.dockerignore`**:
    *   Ignore `node_modules`, `.git`, `.github`, etc.

### Step 3: Configure GitHub Actions (CI/CD)
1.  **Continuous Integration (`.github/workflows/ci.yml`)**:
    *   Trigger: Pull Requests to `main`.
    *   Environment: `ubuntu-latest`, Node.js setup.
    *   Jobs: `lint`, `test`, `build` (dry run) using Turborepo to only test affected packages.
2.  **Continuous Deployment (`.github/workflows/cd.yml`)**:
    *   Trigger: Pushes to `main`.
    *   Environment: `ubuntu-latest`.
    *   Jobs:
        *   **Vercel Deployment (Optional/Explicit):** We will rely on Vercel's native GitHub integration for simplicity on the free tier, but we will add a placeholder for Vercel CLI deployment if needed.
        *   **Render Deployment:** Render provides a "Deploy Hook" URL for free tier Web Services. We will create a `curl` command to trigger this webhook when changes are pushed to `apps/scraper-service` or its dependencies (`packages/*`). This avoids unnecessary Render deployments when only the frontend changes.
        *   **Cron Keep-Alive (Optional):** We will document or add a scheduled GitHub Action to ping the Render service every 14 minutes, preventing it from sleeping on the free tier.

### Step 4: Verification
1.  Verify the directory structure exists.
2.  Verify the `Dockerfile` is syntactically correct and includes the right dependencies for Chromium.
3.  Verify the GitHub Actions YAML files are valid and well-structured.
