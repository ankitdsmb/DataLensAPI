import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const singlePagePolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: singlePagePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, singlePagePolicy);
  const urls = collectUrlInputs(body, singlePagePolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: singlePagePolicy.timeoutMs });
    results.push({
      url,
      title: $('title').text().trim() || null,
      h1: $('h1').first().text().trim() || null
    });
  }

  return {
    results
  };
});
