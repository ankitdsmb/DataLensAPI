import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const communityPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: communityPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, communityPolicy);
  const urls = collectUrlInputs(body, communityPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: communityPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const discussionCount = $('a[href*="discussion"], a[href*="topic"]').length;
    results.push({ url, title, discussionCount });
  }

  return { results };
});
