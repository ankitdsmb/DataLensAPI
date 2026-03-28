import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  stealthGet
,
  safeJsonParse,
  requireAllowedFields} from '@forensic/scraping-core';

const domainAvailabilityPolicy = createToolPolicy({
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

export const POST = withScrapingHandler({ policy: domainAvailabilityPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, domainAvailabilityPolicy);
  requireAllowedFields(body, ['domain']);
  const domain = normalizeDomain(body);

  const data = await lookupA(domain, domainAvailabilityPolicy.timeoutMs);
  const available = (data as Record<string, unknown>)?.Status === 3;

  return {
    domain,
    available,
    dnsStatus: (data as Record<string, unknown>)?.Status ?? null
  };
});
