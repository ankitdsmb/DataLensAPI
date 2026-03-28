import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const gainsightPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: gainsightPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, gainsightPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, gainsightPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: gainsightPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const ideaCount = $('[data-testid="idea-card"], .idea-card').length;
    results.push({ url, title, ideaCount });
  }

  return { results };
});
