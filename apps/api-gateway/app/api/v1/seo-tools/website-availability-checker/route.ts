import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  stealthGet,
  withScrapingHandler
} from '@forensic/scraping-core';

const availabilityPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 20,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: availabilityPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, availabilityPolicy);
  const urls = collectUrlInputs(body, availabilityPolicy);

  const results = [];

  for (const url of urls) {
    const start = Date.now();
    try {
      const response = await stealthGet(url, { timeoutMs: availabilityPolicy.timeoutMs, throwHttpErrors: false });
      results.push({
        url,
        status: response.statusCode ?? null,
        responseTimeMs: Date.now() - start,
        available: response.statusCode ? response.statusCode < 500 : false
      });
    } catch (error: any) {
      results.push({
        url,
        status: null,
        responseTimeMs: Date.now() - start,
        available: false,
        error: error?.message ?? 'request_failed'
      });
    }
  }

  return {
    results,
    summary: {
      total: results.length,
      available: results.filter((item) => item.available).length
    }
  };
});
