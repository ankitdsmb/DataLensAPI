import {
  createToolPolicy,
  fetchDomainHttpSnapshot,
  lookupDomainARecord,
  normalizeDomain,
  readJsonBody,
  requireAllowedFields,
  toAvailability,
  withScrapingHandler
} from '@forensic/scraping-core';

const domainIntelligencePolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: domainIntelligencePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, domainIntelligencePolicy);
  requireAllowedFields(body, ['domain']);

  const domain = normalizeDomain(body);
  const dns = await lookupDomainARecord(domain, domainIntelligencePolicy.timeoutMs);

  return {
    domains: [
      {
        domain,
        ...toAvailability(dns),
        dns,
        http: await fetchDomainHttpSnapshot(domain, domainIntelligencePolicy.timeoutMs),
        whois: null,
        ipInfo: null
      }
    ],
    mode: 'light'
  };
});
