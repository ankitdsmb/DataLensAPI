import {
  type ExtractedLink,
  analyzeHeadingsSection,
  analyzeImageSeoSection,
  analyzeKeywordDensitySection,
  analyzeMetaTagsSection,
  buildScoreFromIssues,
  collectUrlInputs,
  createToolPolicy,
  extractLinks,
  fetchHtmlDocument,
  optionalBooleanField,
  optionalIntegerField,
  optionalStringArrayField,
  readJsonBody,
  summarizeLinkSection,
  withScrapingHandler
} from '@forensic/scraping-core';

const siteAuditSuitePolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 160 * 1024,
  maxUrlCount: 10,
  anonymous: false,
  cacheTtlSeconds: 300
});

const DEFAULT_PROFILES = ['technical', 'content', 'links', 'images'] as const;
const ALLOWED_PROFILES = new Set<string>(DEFAULT_PROFILES);

function normalizeProfiles(rawProfiles: string[]) {
  if (rawProfiles.length === 0) {
    return [...DEFAULT_PROFILES];
  }

  return rawProfiles
    .map((profile) => profile.toLowerCase())
    .filter((profile, index, list) => ALLOWED_PROFILES.has(profile) && list.indexOf(profile) === index);
}

function normalizeStartInputs(body: Record<string, unknown>) {
  const startUrl = typeof body.startUrl === 'string' ? body.startUrl.trim() : undefined;
  if (startUrl && body.url === undefined) {
    return {
      ...body,
      url: startUrl
    };
  }

  return body;
}

export const POST = withScrapingHandler({ policy: siteAuditSuitePolicy }, async (req: Request) => {
  const rawBody = await readJsonBody<Record<string, unknown>>(req, siteAuditSuitePolicy);
  const body = normalizeStartInputs(rawBody);
  const crawl = optionalBooleanField(body, 'crawl', false);
  const maxPages = optionalIntegerField(body, 'maxPages', { defaultValue: 1, min: 1, max: 10 });
  const requestedKeywords = optionalStringArrayField(body, 'keywords', { maxItems: 50 });
  const profiles = normalizeProfiles(optionalStringArrayField(body, 'profiles', { maxItems: 10 }));
  const topN = optionalIntegerField(body, 'topN', { defaultValue: 20, min: 1, max: 100 });

  const startUrls = collectUrlInputs(body, {
    ...siteAuditSuitePolicy,
    maxUrlCount: crawl ? 1 : siteAuditSuitePolicy.maxUrlCount
  });

  const queue = [...startUrls];
  const visited = new Set<string>();
  const pages = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const url = queue.shift();
    if (!url || visited.has(url)) {
      continue;
    }

    visited.add(url);

    const { $ } = await fetchHtmlDocument(url, { timeoutMs: siteAuditSuitePolicy.timeoutMs });
    const issues = [];
    const pageSections: Record<string, unknown> = {};

    if (profiles.includes('technical') || profiles.includes('content')) {
      const meta = analyzeMetaTagsSection($, url);
      pageSections.meta = meta;
      issues.push(...meta.issues);
    }

    if (profiles.includes('content')) {
      const headings = analyzeHeadingsSection($);
      const keywords = analyzeKeywordDensitySection($, requestedKeywords, topN);
      pageSections.headings = headings;
      pageSections.keywords = keywords;
      issues.push(...headings.issues, ...keywords.issues);
    }

    if (profiles.includes('images')) {
      const images = analyzeImageSeoSection($, url);
      pageSections.images = images;
      issues.push(...images.issues);
    }

    let extractedLinks: ExtractedLink[] = [];
    if (profiles.includes('links') || crawl) {
      extractedLinks = extractLinks($, url, false);
    }

    if (profiles.includes('links')) {
      const links = summarizeLinkSection(extractedLinks);
      pageSections.links = links;
      issues.push(...links.issues);
    }

    if (crawl) {
      extractedLinks
        .filter((link) => link.is_internal)
        .map((link) => link.href)
        .forEach((href) => {
          if (!visited.has(href) && !queue.includes(href) && queue.length + pages.length < maxPages * 4) {
            queue.push(href);
          }
        });
    }

    const severitySummary = {
      high: issues.filter((issue) => issue.severity === 'high').length,
      medium: issues.filter((issue) => issue.severity === 'medium').length,
      low: issues.filter((issue) => issue.severity === 'low').length
    };

    pages.push({
      url,
      score: buildScoreFromIssues(issues),
      issues,
      issueSummary: severitySummary,
      sections: pageSections
    });
  }

  const summary = {
    pageCount: pages.length,
    crawled: crawl,
    maxPages,
    auditedProfiles: profiles,
    siteScore: pages.length === 0
      ? 0
      : Number((pages.reduce((sum, page) => sum + page.score, 0) / pages.length).toFixed(2)),
    critical: 0,
    high: pages.reduce((sum, page) => sum + page.issueSummary.high, 0),
    medium: pages.reduce((sum, page) => sum + page.issueSummary.medium, 0),
    low: pages.reduce((sum, page) => sum + page.issueSummary.low, 0)
  };

  return {
    siteScore: summary.siteScore,
    pages,
    summary
  };
});
