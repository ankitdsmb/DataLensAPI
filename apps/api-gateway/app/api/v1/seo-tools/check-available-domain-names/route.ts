import {
  createToolPolicy,
  optionalStringArrayField,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  stealthGet
,
  safeJsonParse,
  requireAllowedFields
} from '@forensic/scraping-core';

const domainNamesPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 25,
  anonymous: true,
  cacheTtlSeconds: 300
});

function normalizeDomains(body: Record<string, unknown>) {
  const domains = optionalStringArrayField(body, 'domains', { maxItems: 25, fieldLabel: 'domains' });
  if (domains.length === 0) {
    throw new RequestValidationError('domains is required', { field: 'domains' });
  }
  return domains;
}

async function lookupA(domain: string, timeoutMs: number) {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`;
  const response = await stealthGet(url, { timeoutMs, throwHttpErrors: false });
  return response.body ? safeJsonParse<Record<string, unknown>>(response.body) : {};
}

export const POST = withScrapingHandler({ policy: domainNamesPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, domainNamesPolicy);
  requireAllowedFields(body, ['domains']);
  const domains = normalizeDomains(body);

  const results = [];

  for (const domain of domains) {
    const dns = await lookupA(domain, domainNamesPolicy.timeoutMs);
    results.push({
      domain,
      available: dns?.Status === 3,
      dnsStatus: dns?.Status ?? null
    });
  }

  return { results };
});
