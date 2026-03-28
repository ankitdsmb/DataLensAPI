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

const domainInspectorPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: domainInspectorPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, domainInspectorPolicy);
  requireAllowedFields(body, ['domain']);

  const domain = normalizeDomain(body);
  const dns = await lookupDomainARecord(domain, domainInspectorPolicy.timeoutMs);

  return {
    domain,
    ...toAvailability(dns),
    dns,
    http: await fetchDomainHttpSnapshot(domain, domainInspectorPolicy.timeoutMs)
  };
});
