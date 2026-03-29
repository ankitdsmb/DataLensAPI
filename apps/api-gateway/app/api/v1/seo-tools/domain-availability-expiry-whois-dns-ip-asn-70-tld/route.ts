import {
  createToolPolicy,
  extractDnsAnswerData,
  fetchDomainHttpSnapshot,
  lookupDomainARecord,
  normalizeDomain,
  readJsonBody,
  runDnsMatrixLookup,
  requireAllowedFields,
  summarizeDnsAnswers,
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
  const aLookup = await lookupDomainARecord(domain, domainDetailsPolicy.timeoutMs);
  const dnsMatrix = await runDnsMatrixLookup(domain, '', domainDetailsPolicy.timeoutMs);
  const http = await fetchDomainHttpSnapshot(domain, domainDetailsPolicy.timeoutMs);
  const answers = summarizeDnsAnswers(aLookup);
  const aRecords = extractDnsAnswerData(aLookup);

  return {
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
    asn: null,
    ssl: null,
    evidence: {
      liveDns: true,
      liveHttp: true,
      liveWhois: false,
      liveIpInfo: false,
      liveAsn: false,
      liveSsl: false
    },
    contract: {
      productLabel: 'Domain Availability / DNS / HTTP Details (Light)',
      forensicCategory: 'network-wrapper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Returns live DNS availability, A-record summaries, a DNS record matrix, and an HTTPS reachability snapshot. WHOIS, ASN, IP intelligence, and SSL certificate inspection remain out of scope in light mode.'
    }
  };
});
