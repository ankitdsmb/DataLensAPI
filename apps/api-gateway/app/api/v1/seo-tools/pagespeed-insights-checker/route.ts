import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  stealthGet,
  withScrapingHandler
} from '@forensic/scraping-core';

const pagespeedCheckerPolicy = createToolPolicy({
  timeoutMs: 12000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

function parseHeader(headers: Record<string, string | string[] | undefined> | undefined, header: string) {
  const value = headers?.[header];
  if (!value) return null;
  return Array.isArray(value) ? value.join(', ') : value;
}

export const POST = withScrapingHandler({ policy: pagespeedCheckerPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, pagespeedCheckerPolicy);
  const urls = collectUrlInputs(body, pagespeedCheckerPolicy);

  const results = [];

  for (const url of urls) {
    const start = Date.now();
    const response = await stealthGet(url, { timeoutMs: pagespeedCheckerPolicy.timeoutMs, throwHttpErrors: false });
    const responseTimeMs = Date.now() - start;
    const contentLengthHeader = parseHeader(response.headers, 'content-length');
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;

    results.push({
      url,
      status: response.statusCode ?? null,
      responseTimeMs,
      contentLength,
      cacheControl: parseHeader(response.headers, 'cache-control'),
      compression: parseHeader(response.headers, 'content-encoding')
    });
  }

  return { results };
});
