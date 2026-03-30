import {
  createToolPolicy,
  fetchDomainHttpSnapshot,
  lookupDomainARecord,
  readJsonBody,
  RequestValidationError,
  runLightSiteAudit,
  summarizeDnsAnswers,
  summarizeSiteAuditPages,
  toAvailability,
  withScrapingHandler,
  requireAllowedFields,
  optionalStringField
} from '@forensic/scraping-core';

const seobilityRankingPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: seobilityRankingPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, seobilityRankingPolicy);
  requireAllowedFields(body, ['domain']);
  const domain = optionalStringField(body, 'domain');

  if (!domain) {
    throw new RequestValidationError('domain is required', { field: 'domain' });
  }

  const homepageUrl = `https://${domain}`;
  const [dnsPayload, httpSnapshot, pages] = await Promise.all([
    lookupDomainARecord(domain, seobilityRankingPolicy.timeoutMs),
    fetchDomainHttpSnapshot(domain, seobilityRankingPolicy.timeoutMs),
    runLightSiteAudit({
      urls: [homepageUrl],
      keywords: [],
      topN: 20,
      timeoutMs: seobilityRankingPolicy.timeoutMs
    })
  ]);

  return {
    domain,
    homepageUrl,
    status: 'analyzed',
    mode: 'light_domain_audit',
    availability: toAvailability(dnsPayload),
    dnsAnswers: summarizeDnsAnswers(dnsPayload).slice(0, 5),
    http: httpSnapshot,
    pages,
    summary: summarizeSiteAuditPages(pages),
    contract: {
      productLabel: 'Seobility Ranking (Compatibility Lite)',
      forensicCategory: 'html-scraper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Runs shared first-party lightweight homepage audit plus basic live domain checks for the supplied domain. This route does not call the official Seobility service.'
    }
  };
});
