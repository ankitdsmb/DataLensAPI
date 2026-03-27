import {
  analyzeHeadingsSection,
  analyzeImageSeoSection,
  analyzeKeywordDensitySection,
  analyzeMetaTagsSection,
  buildScoreFromIssues,
  collectUrlInputs,
  createToolPolicy,
  extractLinks,
  fetchHtmlDocument,
  optionalIntegerField,
  optionalStringArrayField,
  readJsonBody,
  summarizeLinkSection,
  withScrapingHandler
} from '@forensic/scraping-core';

const proSeoAuditPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 160 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: proSeoAuditPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, proSeoAuditPolicy);
  const urls = collectUrlInputs(body, proSeoAuditPolicy);
  const requestedKeywords = optionalStringArrayField(body, 'keywords', { maxItems: 50 });
  const topN = optionalIntegerField(body, 'topN', { defaultValue: 20, min: 5, max: 100 });

  const pages = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: proSeoAuditPolicy.timeoutMs });
    const meta = analyzeMetaTagsSection($, url);
    const headings = analyzeHeadingsSection($);
    const images = analyzeImageSeoSection($, url);
    const keywords = analyzeKeywordDensitySection($, requestedKeywords, topN);
    const links = summarizeLinkSection(extractLinks($, url, false));
    const issues = [
      ...meta.issues,
      ...headings.issues,
      ...images.issues,
      ...keywords.issues,
      ...links.issues
    ];

    pages.push({
      url,
      score: buildScoreFromIssues(issues),
      issues,
      sections: { meta, headings, images, keywords, links }
    });
  }

  return {
    pages,
    summary: {
      pageCount: pages.length,
      siteScore: pages.length === 0
        ? 0
        : Number((pages.reduce((sum, page) => sum + page.score, 0) / pages.length).toFixed(2))
    }
  };
});
