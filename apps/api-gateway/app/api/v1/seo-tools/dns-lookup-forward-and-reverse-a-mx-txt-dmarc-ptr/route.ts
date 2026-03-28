import {
  createToolPolicy,
  normalizeDomainTarget,
  readJsonBody,
  requireAllowedFields,
  runDnsMatrixLookup,
  withScrapingHandler
} from '@forensic/scraping-core';

const dnsLookupPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: dnsLookupPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, dnsLookupPolicy);
  requireAllowedFields(body, ['domain', 'ip']);

  const { domain, ip } = normalizeDomainTarget(body);

  return {
    domain: domain || null,
    ip: ip || null,
    results: await runDnsMatrixLookup(domain, ip, dnsLookupPolicy.timeoutMs)
  };
});
