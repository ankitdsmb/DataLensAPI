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
  optionalBooleanField,
  optionalIntegerField,
  optionalStringArrayField,
  readJsonBody,
  summarizeLinkSection,
  withScrapingHandler
} from '@forensic/scraping-core';

const sitePulsePolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 160 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: sitePulsePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, sitePulsePolicy);
  const crawl = optionalBooleanField(body, 'crawl', true);
  const maxPages = optionalIntegerField(body, 'maxPages', { defaultValue: 5, min: 1, max: 20 });
  const requestedKeywords = optionalStringArrayField(body, 'keywords', { maxItems: 50 });
  const topN = optionalIntegerField(body, 'topN', { defaultValue: 20, min: 5, max: 100 });

  const startUrls = collectUrlInputs(body, {
    ...sitePulsePolicy,
    maxUrlCount: crawl ? 1 : sitePulsePolicy.maxUrlCount
  });

  const queue = [...startUrls];
  const visited = new Set<string>();
  const pages = [];

  while (queue.length && pages.length < maxPages) {
    const url = queue.shift();
    if (!url || visited.has(url)) {
      continue;
    }

    visited.add(url);
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: sitePulsePolicy.timeoutMs });
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

    if (crawl) {
      extractLinks($, url, true)
        .map((link) => link.href)
        .forEach((href) => {
          if (!visited.has(href) && !queue.includes(href) && pages.length + queue.length < maxPages * 2) {
            queue.push(href);
          }
        });
    }
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
