import {
  createToolPolicy,
  fetchDomainHttpSnapshot,
  lookupDomainARecord,
  readJsonBody,
  runLightSiteAudit,
  summarizeDnsAnswers,
  summarizeSiteAuditPages,
  toAvailability,
  withScrapingHandler,
  RequestValidationError,
  requireAllowedFields
} from '@forensic/scraping-core';

const mozSpamPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

const RISK_TLDS = new Set(['xyz', 'top', 'club', 'info', 'biz', 'loan', 'work', 'click', 'link', 'gq', 'tk', 'ml', 'ga', 'cf']);

function normalizeDomainInput(raw: string) {
  const trimmed = raw.trim();
  const cleaned = trimmed.replace(/^https?:\/\//i, '').split('/')[0];
  return cleaned.toLowerCase();
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreSpamSignals({
  tldRisk,
  digitRatio,
  hyphenCount,
  httpsReachable,
  hasARecord,
  auditScore
}: {
  tldRisk: boolean;
  digitRatio: number;
  hyphenCount: number;
  httpsReachable: boolean;
  hasARecord: boolean;
  auditScore: number;
}) {
  let score = 10;
  if (tldRisk) score += 20;
  if (digitRatio > 0.2) score += 15;
  if (digitRatio > 0.4) score += 10;
  if (hyphenCount >= 2) score += 10;
  if (!httpsReachable) score += 15;
  if (!hasARecord) score += 25;
  if (auditScore < 40) score += 15;
  if (auditScore >= 80) score -= 10;
  return clampScore(score);
}

export const POST = withScrapingHandler({ policy: mozSpamPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, mozSpamPolicy);
  requireAllowedFields(body, ['domain']);
  const domainRaw = typeof body.domain === 'string' ? body.domain : '';
  const domain = normalizeDomainInput(domainRaw);
  if (!domain) {
    throw new RequestValidationError('domain is required', { field: 'domain' });
  }

  const homepageUrl = `https://${domain}`;
  const [dnsPayload, httpSnapshot, pages] = await Promise.all([
    lookupDomainARecord(domain, mozSpamPolicy.timeoutMs),
    fetchDomainHttpSnapshot(domain, mozSpamPolicy.timeoutMs),
    runLightSiteAudit({
      urls: [homepageUrl],
      keywords: [],
      topN: 20,
      timeoutMs: mozSpamPolicy.timeoutMs
    })
  ]);

  const dnsAnswers = summarizeDnsAnswers(dnsPayload);
  const hasARecord = dnsAnswers.some((answer) => Boolean(answer.data));
  const availability = toAvailability(dnsPayload);
  const auditSummary = summarizeSiteAuditPages(pages);
  const auditScore = auditSummary.siteScore ?? 0;
  const digitCount = (domain.match(/\d/g) ?? []).length;
  const hyphenCount = (domain.match(/-/g) ?? []).length;
  const digitRatio = domain.length === 0 ? 0 : digitCount / domain.length;
  const tld = domain.split('.').pop() ?? '';
  const tldRisk = RISK_TLDS.has(tld);
  const httpsReachable = Boolean(httpSnapshot.status && httpSnapshot.status < 500);

  const spamScore = scoreSpamSignals({
    tldRisk,
    digitRatio,
    hyphenCount,
    httpsReachable,
    hasARecord,
    auditScore
  });
  const authorityProxy = clampScore(auditScore * 0.7 + (httpsReachable ? 15 : 0) + (hasARecord ? 10 : 0));
  const pageProxy = clampScore(authorityProxy * 0.85);

  return {
    domain,
    homepageUrl,
    status: 'analyzed',
    mode: 'proxy_scores',
    da: authorityProxy,
    pa: pageProxy,
    spamScore,
    scoreSources: {
      da: 'proxy',
      pa: 'proxy',
      spamScore: 'heuristic'
    },
    signals: {
      tld,
      tldRisk,
      digitRatio: Number(digitRatio.toFixed(2)),
      digitCount,
      hyphenCount,
      availability,
      hasARecord,
      httpsReachable,
      auditScore,
      issueCount: pages.reduce((sum, page) => sum + page.issues.length, 0)
    },
    pages,
    summary: auditSummary,
    evidence: {
      dnsChecked: true,
      httpChecked: true,
      auditRan: true
    },
    contract: {
      productLabel: 'Moz DA/PA Spam (Proxy Lite)',
      forensicCategory: 'html-scraper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Produces heuristic proxy scores and spam signals from live domain checks plus the shared lightweight homepage audit. This route does not call the official Moz API.'
    }
  };
});
