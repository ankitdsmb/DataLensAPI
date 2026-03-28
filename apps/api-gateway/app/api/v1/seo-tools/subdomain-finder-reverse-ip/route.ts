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

const subdomainFinderPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 300
});

function normalizeInputs(body: Record<string, unknown>) {
  const domain = typeof body.domain === 'string' ? body.domain.trim() : '';
  const ip = typeof body.ip === 'string' ? body.ip.trim() : '';
  if (!domain && !ip) {
    throw new RequestValidationError('domain or ip is required', { field: 'domain', alternateField: 'ip' });
  }
  return { domain, ip };
}

async function lookupPtr(ip: string, timeoutMs: number) {
  const reversed = ip.split('.').reverse().join('.') + '.in-addr.arpa';
  const url = `https://dns.google/resolve?name=${encodeURIComponent(reversed)}&type=PTR`;
  const response = await stealthGet(url, { timeoutMs, throwHttpErrors: false });
  return response.body ? safeJsonParse<Record<string, unknown>>(response.body) : {};
}

async function lookupSubdomains(domain: string, timeoutMs: number) {
  const url = `https://crt.sh/?q=${encodeURIComponent(`%.${domain}`)}&output=json`;
  const response = await stealthGet(url, { timeoutMs, throwHttpErrors: false });
  const data = response.body ? safeJsonParse<Record<string, unknown>>(response.body) : [];
  const names = Array.isArray(data)
    ? data.flatMap((item: { name_value?: string }) => (item.name_value || '').split('\n'))
    : [];
  return Array.from(new Set(names.filter(Boolean)));
}

export const POST = withScrapingHandler({ policy: subdomainFinderPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, subdomainFinderPolicy);
  requireAllowedFields(body, ['domain', 'ip']);
  const { domain, ip } = normalizeInputs(body);

  const subdomains = domain ? await lookupSubdomains(domain, subdomainFinderPolicy.timeoutMs) : [];
  const reverse = ip ? await lookupPtr(ip, subdomainFinderPolicy.timeoutMs) : null;

  return {
    domain: domain || null,
    ip: ip || null,
    subdomains,
    reverse
  };
});
