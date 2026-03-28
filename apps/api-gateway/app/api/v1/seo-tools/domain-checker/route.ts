import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  stealthGet
,
  safeJsonParse} from '@forensic/scraping-core';

const domainCheckerPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
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
  return response.body ? safeJsonParse<Record<string, unknown>>(response.body) : {};
}

export const POST = withScrapingHandler({ policy: domainCheckerPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, domainCheckerPolicy);
  const domain = normalizeDomain(body);
  const dns = await lookupA(domain, domainCheckerPolicy.timeoutMs);

  return {
    domain,
    available: dns?.Status === 3,
    dnsStatus: dns?.Status ?? null
  };
});
