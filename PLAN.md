# Forensic Analysis & Data Extraction API Suite: Architecture & Deployment Plan

## 1. Forensic Analysis
Based on `STRATEGY.md` and `TECHNICAL_DESIGN.md`, the system is a 50-tool API suite. It requires a mixed deployment strategy to stay within free-tier limits of cloud providers.

*   **Lightweight APIs (80%)**: Handle standard HTTP requests and HTML parsing (Cheerio, API proxying). These will be deployed to **Vercel** as Serverless Functions.
*   **Heavyweight APIs (20%)**: Require headless browsers (Puppeteer/Playwright) to bypass bot protection or render SPAs. These will be deployed as a single Express server in a Docker container to **Render**'s Free Web Service tier.

## 2. Project Structure (Monorepo)
To avoid duplicating code (e.g., stealth proxy logic, types), we will use a **Turborepo** monorepo with `npm workspaces`.

```text
/
├── package.json          # Root workspace configuration
├── turbo.json            # Turborepo task runner config
├── apps/
│   ├── web-frontend/     # Next.js UI (Vercel)
│   ├── api-gateway/      # Next.js Serverless API Routes (Vercel)
│   └── scraper-service/  # Express.js + Docker (Render)
└── packages/
    ├── shared-types/     # TypeScript interfaces for API schemas
    ├── scraping-core/    # Stealth logic, HTML parsers, proxy rotators
    └── logger/           # Shared logging utilities
```

## 3. Docker Configuration for Free Hosting (Render)
The Render free tier offers 512MB RAM and 0.1 CPU. It goes to sleep after 15 minutes of inactivity.
*   **Challenges:** Headless Chrome (Puppeteer/Playwright) requires significant memory and specific OS-level dependencies (fonts, system libraries).
*   **Solution:** We will use a lightweight Alpine or Debian-slim Node.js image. We must manually install Chromium and its dependencies in the `Dockerfile` to ensure it runs correctly on Render without using massive pre-built Playwright images that might exceed memory limits or build timeouts.
*   **Environment Variables:** We'll configure Puppeteer to use the installed Chromium executable path.

## 4. Git CI/CD Configuration (GitHub Actions)
Since we are using Vercel and Render:
*   **Vercel (apps/web-frontend, apps/api-gateway):** Vercel has native GitHub integration. Pushes to `main` automatically trigger deployments. However, we will configure a GitHub Action for *Continuous Integration* (CI) to run `npm run test` and `npm run lint` before allowing merges to `main`.
*   **Render (apps/scraper-service):** Render also has auto-deploy from GitHub. We will create a GitHub Action workflow to automatically trigger the Render deployment webhook ONLY when changes occur in `apps/scraper-service` or its dependencies (`packages/*`).
*   **Workflows:**
    *   `.github/workflows/ci.yml`: Runs tests, linting, and type checking on Pull Requests.
    *   `.github/workflows/cd.yml`: Triggers Render deployment webhooks on push to `main` (if Vercel auto-deploy is used, Vercel handles itself, but we can also use Vercel CLI in Actions if strict manual control is needed. For free tiers, native auto-deploy is preferred, but we will define the Action to trigger Render explicitly).
