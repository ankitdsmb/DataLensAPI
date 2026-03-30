import {
  createToolPolicy,
  extractDnsAnswerData,
  fetchDomainHttpSnapshot,
  lookupDomainARecord,
  normalizeDomain,
  readJsonBody,
  requireAllowedFields,
  runDnsMatrixLookup,
  summarizeDnsAnswers,
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
  const aLookup = await lookupDomainARecord(domain, domainIntelligencePolicy.timeoutMs);
  const dnsMatrix = await runDnsMatrixLookup(domain, '', domainIntelligencePolicy.timeoutMs);
  const http = await fetchDomainHttpSnapshot(domain, domainIntelligencePolicy.timeoutMs);
  const answers = summarizeDnsAnswers(aLookup);
  const aRecords = extractDnsAnswerData(aLookup);

  return {
    domains: [
      {
        domain,
        ...toAvailability(aLookup),
        dns: {
          status: aLookup.Status ?? null,
          answerCount: answers.length,
          aRecords,
          answers,
          matrix: dnsMatrix
        },
        http: {
          ...http,
          reachable: typeof http.status === 'number' && http.status > 0 && http.status < 500
        },
        whois: null,
        ipInfo: null,
        ssl: null
      }
    ],
    mode: 'light',
    evidence: {
      liveDns: true,
      liveHttp: true,
      liveWhois: false,
      liveSsl: false
    },
    contract: {
      productLabel: 'Domain Intelligence Suite (Light)',
      forensicCategory: 'network-wrapper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Performs live DNS lookups and an HTTPS reachability snapshot. WHOIS, ASN, and SSL certificate inspection remain out of scope in light mode.'
    }
  };
});
