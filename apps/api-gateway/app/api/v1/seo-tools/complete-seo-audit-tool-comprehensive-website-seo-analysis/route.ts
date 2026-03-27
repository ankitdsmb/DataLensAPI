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

const completeSeoAuditPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 160 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: completeSeoAuditPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, completeSeoAuditPolicy);
  const urls = collectUrlInputs(body, completeSeoAuditPolicy);
  const requestedKeywords = optionalStringArrayField(body, 'keywords', { maxItems: 50 });
  const topN = optionalIntegerField(body, 'topN', { defaultValue: 20, min: 5, max: 100 });

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: completeSeoAuditPolicy.timeoutMs });
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

    results.push({
      url,
      score: buildScoreFromIssues(issues),
      issues,
      sections: { meta, headings, images, keywords, links }
    });
  }

  return { results };
});
