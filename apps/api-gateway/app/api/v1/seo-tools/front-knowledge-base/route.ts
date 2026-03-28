import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const frontKbPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: frontKbPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, frontKbPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, frontKbPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: frontKbPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const articleCount = $('a[href*="/articles"]').length;
    results.push({ url, title, articleCount });
  }

  return { results };
});
