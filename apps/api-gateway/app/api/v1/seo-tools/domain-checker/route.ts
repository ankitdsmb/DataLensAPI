import {
  createToolPolicy,
  lookupDomainARecord,
  normalizeDomain,
  readJsonBody,
  requireAllowedFields,
  toAvailability,
  withScrapingHandler
} from '@forensic/scraping-core';

const domainCheckerPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: domainCheckerPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, domainCheckerPolicy);
  requireAllowedFields(body, ['domain']);

  const domain = normalizeDomain(body);
  const availability = toAvailability(await lookupDomainARecord(domain, domainCheckerPolicy.timeoutMs));

  return {
    domain,
    ...availability
  };
});
