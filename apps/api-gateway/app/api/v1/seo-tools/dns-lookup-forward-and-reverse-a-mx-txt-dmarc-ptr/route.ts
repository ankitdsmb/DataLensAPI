import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  stealthGet
,
  safeJsonParse,
  requireAllowedFields
} from '@forensic/scraping-core';

const dnsLookupPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 300
});

const DNS_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'PTR'];

function normalizeTarget(body: Record<string, unknown>) {
  const domain = typeof body.domain === 'string' ? body.domain.trim() : '';
  const ip = typeof body.ip === 'string' ? body.ip.trim() : '';

  if (!domain && !ip) {
    throw new RequestValidationError('domain or ip is required', {
      field: 'domain',
      alternateField: 'ip'
    });
  }

  return { domain, ip };
}

async function queryDns(name: string, type: string, timeoutMs: number) {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
  const response = await stealthGet(url, { timeoutMs, throwHttpErrors: false });
  return response.body ? safeJsonParse<Record<string, unknown>>(response.body) : {};
}

export const POST = withScrapingHandler({ policy: dnsLookupPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, dnsLookupPolicy);
  requireAllowedFields(body, ['domain', 'ip']);
  const { domain, ip } = normalizeTarget(body);

  const results = [];

  for (const type of DNS_TYPES) {
    if (type === 'PTR' && !ip) {
      continue;
    }
    const name = type === 'PTR'
      ? ip.split('.').reverse().join('.') + '.in-addr.arpa'
      : domain;
    try {
      const data = await queryDns(name, type, dnsLookupPolicy.timeoutMs);
      results.push({ type, name, data });
    } catch (error: any) {
      results.push({ type, name, error: error?.message ?? 'lookup_failed' });
    }
  }

  return {
    domain: domain || null,
    ip: ip || null,
    results
  };
});
