# OpenIntel / OmniScrape / NexusAPI

Welcome to the central repository for your Forensic Analysis & Data Extraction API Suite.

## Project Name Suggestions
Choosing a strong name helps build trust with users of your free tool website. Here are some options based on the "forensic analysis" and "open-source scraping" nature of the suite:

1. **OpenIntel (or OpenIntel API):** Professional, implies Open-Source Intelligence (OSINT).
2. **OmniScrape:** Focuses on the "all-in-one" nature of the 50 tools.
3. **NexusAPI:** Sounds like a central hub or gateway for multiple data sources.
4. **ForensicX:** Sharp, edgy, focuses heavily on the "deep analysis" aspect.
5. **DataLens API:** Implies focusing in and analyzing raw data from the web.

*For the purpose of this architecture, we will refer to it as the "OmniScrape Monorepo".*

## Why One Git Repository is 100% Sufficient (and Recommended)

Yes, **one single Git repository is absolutely sufficient** and is the industry standard for this type of architecture. This is called a **Monorepo** (Monolithic Repository).

### Why a Monorepo is the Best Choice for 50 APIs:
If you created 50 different Git repositories for 50 APIs, maintaining them would be a nightmare. Updating a single shared utility (like a proxy rotation script) would require 50 separate commits.

By using one Git repository managed by **Turborepo** or **npm workspaces**, you gain massive advantages:

1. **Shared Code:** You can write your `fetchHTML()`, `rotateProxy()`, and `handleErrors()` functions once in a `packages/shared` folder, and all 50 APIs can import and use them instantly.
2. **Unified Deployments:** 
   * When you push to the `main` branch, Vercel automatically detects changes in the `apps/api-gateway` folder and deploys your lightweight serverless APIs.
   * Render automatically detects changes in the `apps/scraper-service` folder and deploys your heavyweight headless browser API.
3. **Single Dependency Tree:** You only need to install heavy libraries like `puppeteer` or `cheerio` once.
4. **Unified Frontend:** You can build your frontend website (`apps/web-frontend`) right next to your APIs. The frontend can instantly import TypeScript types from the backend, ensuring your UI always knows exactly what the API responses look like.

### Monorepo Structure Example

```text
/omni-scrape-monorepo (Your single Git Repo)
├── apps/
│   ├── web-frontend/       (The UI for your free tools)
│   ├── api-serverless/     (40 lightweight APIs hosted on Vercel)
│   └── api-heavyweight/    (10 Playwright APIs hosted on Render)
└── packages/
    ├── types/              (TypeScript interfaces)
    └── scraper-core/       (Your stealth and proxy logic)
```

## Documentation References
For full technical details on how these APIs are structured and deployed for free, please review:
* [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md) - Payload, request, and response schemas for the APIs.
* [STRATEGY.md](./STRATEGY.md) - The free-tier deployment and hosting architecture.

