import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler
} from '@forensic/scraping-core';

const trendingNewsPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: trendingNewsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, trendingNewsPolicy);
  const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';

  if (!keyword) {
    throw new RequestValidationError('keyword is required', { field: 'keyword' });
  }

  const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(keyword)}`;

  return {
    keyword,
    searchUrl
  };
});
