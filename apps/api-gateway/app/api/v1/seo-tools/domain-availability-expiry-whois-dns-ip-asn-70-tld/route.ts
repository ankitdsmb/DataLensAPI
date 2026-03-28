import {
  createToolPolicy,
  lookupDomainARecord,
  normalizeDomain,
  readJsonBody,
  requireAllowedFields,
  toAvailability,
  withScrapingHandler
} from '@forensic/scraping-core';

const domainDetailsPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: domainDetailsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, domainDetailsPolicy);
  requireAllowedFields(body, ['domain']);

  const domain = normalizeDomain(body);
  const dns = await lookupDomainARecord(domain, domainDetailsPolicy.timeoutMs);

  return {
    domain,
    ...toAvailability(dns),
    dns,
    whois: null,
    ipInfo: null
  };
});
