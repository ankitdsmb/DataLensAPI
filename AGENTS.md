# Scraper Implementation SOP (Agent Skill)

This file dictates the Standard Operating Procedure (SOP) for an AI agent implementing new tools in the Forensic Analysis API Suite.

## 1. Goal Setting & Planning
*   **Identify the Tool:** Read the request and identify which of the 50 tools from `TECHNICAL_DESIGN.md` needs implementation.
*   **Determine Weight Class:**
    *   *Lightweight (Vercel):* Uses HTTP clients (`got-scraping`) and DOM parsing (`cheerio`). Belongs in `apps/api-gateway`.
    *   *Heavyweight (Render):* Requires headless browsers (`puppeteer`/`playwright`). Belongs in `apps/scraper-service`.

## 2. Implementation Standards (Next.js App Router API)
*   **File Structure:** `apps/api-gateway/app/api/v1/[category]/[tool-name]/route.ts`.
*   **HTTP Method:** Must be an exported `POST` function handling the request body.
*   **HTTP Client:** Always use `got-scraping` (imported dynamically or standardly if supported) to mimic Chrome TLS fingerprints and reduce 403 blocks.
*   **DOM Parser:** Always use `cheerio` for HTML extraction.
*   **Standardized Response:** Every endpoint MUST return a JSON response matching the project schema:
    ```json
    {
      "success": true,
      "data": { /* extracted data */ },
      "metadata": {
        "timestamp": "ISO_STRING",
        "execution_time_ms": 123
      },
      "error": null
    }
    ```
*   **Error Handling:** Wrap all scraping logic in a `try...catch`. In the `catch` block, return HTTP 500 (or appropriate code) with `success: false` and the error message in the `error` field.

## 3. HTML Documentation System Update
*   **Mandatory Update:** After implementing any API, the agent MUST update `docs/index.html` (or create it if it doesn't exist).
*   **Documentation Template per Tool:**
    *   **Tool Name & Endpoint**
    *   **Description & Use Case**
    *   **Request Payload Example** (JSON format)
    *   **Response Schema Example** (JSON format)
    *   **Technical Challenges & Workarounds:** Explain *how* the site was scraped (e.g., "Found __NEXT_DATA__ JSON in script tag").
    *   **Configuration Needed:** (e.g., specific headers, proxies, cookies).
    *   **Coding Recall (Short Notes):** A 1-2 sentence summary of the core code mechanism (e.g., "Used Cheerio to query `$('video source').attr('src')`").

## 4. Pre-commit Verification
*   Verify the endpoint syntax is valid Next.js App Router code (`export async function POST(req: Request)`).
*   Verify the standard JSON envelope is used in both success and error responses.
