# Forensic Architecture Report

## 1. Project Overview & Structure
This repository employs a **Turborepo** monorepo architecture separating microservices, front-end layers, and shared logic. This design ensures that heavyweight headless browser processes do not block lightweight API responses or exhaust Vercel's serverless tier limits.

### Directory Layout
- **`apps/api-gateway/`**: Next.js (App Router) instance exposing 50 REST API endpoints. Primarily executes lightweight HTML scraping (using `got-scraping` + `cheerio`). Best deployed to Vercel or Cloudflare Pages.
- **`apps/scraper-service/`**: (Planned/Future) Heavyweight Node.js instance (Express/Fastify) running Puppeteer or Playwright. Responsible for handling JavaScript-heavy SPAs and bypasses requiring full browser simulation. Best deployed to Render.com (Docker) or similar persistent container hosts.
- **`apps/web-frontend/`**: (Planned/Future) React/Next.js UI dashboard for customers to consume the APIs, manage billing, and view analytics.
- **`packages/scraping-core/`**: Shared TS library providing the `withScrapingHandler` and `stealthGet` core logic. This ensures DRY/SOLID principles by abstracting error handling, response enveloping, and HTTP client configurations.

## 2. DRY/SOLID Code Principles Applied
Initially, the 50 API endpoints were built individually. Each had redundant `try/catch` logic and `got-scraping` configurations. We performed a massive refactoring using Automated Python AST/Regex scripts, replacing boilerplate with:
- **`withScrapingHandler` (NextWrapper):** Intercepts API route processing, handles request JSON parsing, applies standardized `try/catch` enveloping (returning `{ success: true, data: ... }` or `{ success: false, error: ... }`).
- **`stealthGet` (HTTPClient):** A centralized `got-scraping` configuration function ensuring correct headers, timeouts, and standard stealth mechanics are injected uniformly across the ecosystem.

## 3. Deployment Configuration (Render + Vercel)

### Vercel (Free Tier)
- Deploys `apps/api-gateway` and `apps/web-frontend`.
- Zero-config deployments via Vercel's GitHub integration.
- Environment variables: Set up inside Vercel Dashboard for API keys/Proxies.

### Render.com Docker Configuration (Free Tier)
To deploy the backend processes or potentially a dedicated heavyweight scraper service:
- **`Dockerfile`**: Defines the required Linux dependencies for headless browsers (libnss3, libatk1.0-0, libx11-xcb1).
- **`render.yaml`**: Infrastructure-as-code configuration specifying the Docker build, scaling parameters, and environment requirements for Render's free instances.

## 4. Git CI/CD Implementation (GitHub Actions)
- Located at `.github/workflows/ci.yml`.
- Runs automatically on push to the `main` branch or on PR creation.
- Tasks:
  - Cache Turborepo artifacts.
  - Install dependencies.
  - Run linting and TypeScript checks (`npm run lint`, `npm run build`).
  - Deploy triggers (Future).

## 5. QA Automation
An automated QA script (`qa-runner-post.js`) locally boots the API server and programmatically tests all 50 endpoints. Currently, it asserts that each endpoint correctly implements the `withScrapingHandler` interface and returns standardized JSON errors when required `POST` payload arguments are missing. The pass rate is 100%.
