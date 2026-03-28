import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const movieNewsPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: movieNewsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, movieNewsPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, movieNewsPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: movieNewsPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const articleCount = $('article, .article').length;
    results.push({ url, title, articleCount });
  }

  return { results };
});
