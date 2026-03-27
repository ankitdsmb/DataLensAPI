import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  stealthGet,
  withScrapingHandler
} from '@forensic/scraping-core';

const statusCodePolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 50,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: statusCodePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, statusCodePolicy);
  const urls = collectUrlInputs(body, statusCodePolicy);

  const results = [];

  for (const url of urls) {
    const startedAt = Date.now();
    try {
      const response = await stealthGet(url, { timeoutMs: statusCodePolicy.timeoutMs, throwHttpErrors: false });
      results.push({
        url,
        status: response.statusCode ?? null,
        redirected: Boolean(response.redirectUrls?.length),
        responseTimeMs: Date.now() - startedAt
      });
    } catch (error: any) {
      results.push({
        url,
        status: null,
        redirected: false,
        responseTimeMs: Date.now() - startedAt,
        error: error?.message ?? 'request_failed'
      });
    }
  }

  return {
    results,
    summary: {
      total: results.length,
      broken: results.filter((item) => item.status && item.status >= 400).length
    }
  };
});
