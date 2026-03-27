import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  stealthGet
} from '@forensic/scraping-core';

const domainInspectorPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 300
});

function normalizeDomain(body: Record<string, unknown>) {
  const domain = typeof body.domain === 'string' ? body.domain.trim() : '';
  if (!domain) {
    throw new RequestValidationError('domain is required', { field: 'domain' });
  }
  return domain;
}

async function lookupA(domain: string, timeoutMs: number) {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`;
  const response = await stealthGet(url, { timeoutMs, throwHttpErrors: false });
  return response.body ? JSON.parse(response.body) : {};
}

export const POST = withScrapingHandler({ policy: domainInspectorPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, domainInspectorPolicy);
  const domain = normalizeDomain(body);

  const dns = await lookupA(domain, domainInspectorPolicy.timeoutMs);
  const url = `https://${domain}`;
  const response = await stealthGet(url, { timeoutMs: domainInspectorPolicy.timeoutMs, throwHttpErrors: false });

  return {
    domain,
    available: dns?.Status === 3,
    dns,
    http: {
      status: response.statusCode ?? null,
      redirected: Boolean(response.redirectUrls?.length),
      finalUrl: response.redirectUrls?.length
        ? response.redirectUrls[response.redirectUrls.length - 1]
        : url
    }
  };
});
