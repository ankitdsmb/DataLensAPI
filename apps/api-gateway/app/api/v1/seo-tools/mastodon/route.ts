import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const mastodonPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: mastodonPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, mastodonPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, mastodonPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: mastodonPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const statusCount = $('.status, .status__content').length;
    results.push({ url, title, statusCount });
  }

  return { results };
});
