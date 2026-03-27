import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  stealthGet,
  withScrapingHandler
} from '@forensic/scraping-core';

const securityAuditPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

const SECURITY_HEADERS = [
  'strict-transport-security',
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy'
];

export const POST = withScrapingHandler({ policy: securityAuditPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, securityAuditPolicy);
  const urls = collectUrlInputs(body, securityAuditPolicy);

  const results = [];

  for (const url of urls) {
    const response = await stealthGet(url, { timeoutMs: securityAuditPolicy.timeoutMs, throwHttpErrors: false });
    const headers = response.headers ?? {};

    const missing = SECURITY_HEADERS.filter((header) => !headers[header]);

    results.push({
      url,
      status: response.statusCode ?? null,
      missingHeaders: missing,
      hasHsts: Boolean(headers['strict-transport-security']),
      hasCsp: Boolean(headers['content-security-policy'])
    });
  }

  return {
    results,
    summary: {
      total: results.length,
      withMissingHeaders: results.filter((item) => item.missingHeaders.length > 0).length
    }
  };
});
