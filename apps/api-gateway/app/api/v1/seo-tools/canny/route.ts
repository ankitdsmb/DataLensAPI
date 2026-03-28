import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const cannyPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: cannyPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, cannyPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, cannyPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: cannyPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const boards = $('a[href*="/board"], a[href*="/canny"]').length;
    const ideas = $('[data-testid="post-title"], .post-title').length;

    results.push({
      url,
      title,
      boardCount: boards,
      ideaCount: ideas
    });
  }

  return { results };
});
