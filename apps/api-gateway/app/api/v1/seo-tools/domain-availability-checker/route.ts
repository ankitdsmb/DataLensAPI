import {
  createToolPolicy,
  lookupDomainARecord,
  normalizeDomain,
  readJsonBody,
  requireAllowedFields,
  toAvailability,
  withScrapingHandler
} from '@forensic/scraping-core';

const domainAvailabilityPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: domainAvailabilityPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, domainAvailabilityPolicy);
  requireAllowedFields(body, ['domain']);

  const domain = normalizeDomain(body);
  const availability = toAvailability(await lookupDomainARecord(domain, domainAvailabilityPolicy.timeoutMs));

  return {
    domain,
    ...availability
  };
});
