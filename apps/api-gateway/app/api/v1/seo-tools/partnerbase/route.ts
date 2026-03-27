import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const partnerbasePolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 180
});

export const POST = withScrapingHandler({ policy: partnerbasePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, partnerbasePolicy);
  const urls = collectUrlInputs(body, partnerbasePolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: partnerbasePolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const cards = $('[data-testid*="partner"], [class*="partner"]').length;

    results.push({
      url,
      title,
      partnerCardCount: cards
    });
  }

  return { results };
});
