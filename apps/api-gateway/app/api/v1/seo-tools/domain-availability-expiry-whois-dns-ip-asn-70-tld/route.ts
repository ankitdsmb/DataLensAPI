import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  stealthGet
} from '@forensic/scraping-core';

const domainDetailsPolicy = createToolPolicy({
  timeoutMs: 8000,
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

async function lookupDns(domain: string, timeoutMs: number) {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`;
  const response = await stealthGet(url, { timeoutMs, throwHttpErrors: false });
  return response.body ? JSON.parse(response.body) : {};
}

export const POST = withScrapingHandler({ policy: domainDetailsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, domainDetailsPolicy);
  const domain = normalizeDomain(body);
  const dns = await lookupDns(domain, domainDetailsPolicy.timeoutMs);

  return {
    domain,
    available: dns?.Status === 3,
    dns,
    whois: null,
    ipInfo: null
  };
});
