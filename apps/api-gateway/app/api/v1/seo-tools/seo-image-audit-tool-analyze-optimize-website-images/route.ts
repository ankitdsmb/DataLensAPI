import {
  analyzeImageSeoSection,
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const seoImageAuditPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: seoImageAuditPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, seoImageAuditPolicy);
  const urls = collectUrlInputs(body, seoImageAuditPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: seoImageAuditPolicy.timeoutMs });
    results.push({
      url,
      analysis: analyzeImageSeoSection($, url)
    });
  }

  return { results };
});
