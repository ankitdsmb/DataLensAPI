import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  stealthGet,
  withScrapingHandler
} from '@forensic/scraping-core';

const performanceAuditPolicy = createToolPolicy({
  timeoutMs: 12000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

function parseHeader(response: { headers?: Record<string, string | string[] | undefined> }, header: string) {
  const value = response.headers?.[header];
  if (!value) return null;
  return Array.isArray(value) ? value.join(', ') : value;
}

export const POST = withScrapingHandler({ policy: performanceAuditPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, performanceAuditPolicy);
  const urls = collectUrlInputs(body, performanceAuditPolicy);

  const results = [];

  for (const url of urls) {
    const start = Date.now();
    const response = await stealthGet(url, { timeoutMs: performanceAuditPolicy.timeoutMs, throwHttpErrors: false });
    const responseTimeMs = Date.now() - start;

    const contentLengthHeader = parseHeader(response, 'content-length');
    const cacheControl = parseHeader(response, 'cache-control');
    const encoding = parseHeader(response, 'content-encoding');

    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;
    const sizeCategory = contentLength
      ? contentLength > 2_000_000
        ? 'large'
        : contentLength > 500_000
          ? 'medium'
          : 'small'
      : 'unknown';

    results.push({
      url,
      status: response.statusCode ?? null,
      responseTimeMs,
      contentLength,
      sizeCategory,
      cacheControl,
      compression: encoding ?? null,
      server: parseHeader(response, 'server'),
      isHttps: url.startsWith('https://')
    });
  }

  return {
    results,
    summary: {
      total: results.length,
      slow: results.filter((item) => item.responseTimeMs > 3000).length,
      largePayloads: results.filter((item) => item.sizeCategory === 'large').length
    }
  };
});
