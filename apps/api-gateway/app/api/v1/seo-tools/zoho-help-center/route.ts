import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const zohoPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 180
});

export const POST = withScrapingHandler({ policy: zohoPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, zohoPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, zohoPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: zohoPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const categories = $('a[href*="category"], [data-category]').length;

    results.push({
      url,
      title,
      categoryCount: categories
    });
  }

  return { results };
});
