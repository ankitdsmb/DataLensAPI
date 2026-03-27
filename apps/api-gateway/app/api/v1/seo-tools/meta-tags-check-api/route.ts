import {
  analyzeMetaTagsSection,
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const metaTagsCheckPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: metaTagsCheckPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, metaTagsCheckPolicy);
  const urls = collectUrlInputs(body, metaTagsCheckPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: metaTagsCheckPolicy.timeoutMs });
    const analysis = analyzeMetaTagsSection($, url);
    results.push({
      url,
      analysis
    });
  }

  return {
    results
  };
});
