import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const crispPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: crispPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, crispPolicy);
  const urls = collectUrlInputs(body, crispPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: crispPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const categoryCount = $('a[href*="/category"], a[href*="/help"]').length;
    results.push({ url, title, categoryCount });
  }

  return { results };
});
