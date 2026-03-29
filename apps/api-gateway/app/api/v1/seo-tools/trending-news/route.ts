import {
  createToolPolicy,
  fetchTrendingNewsFeed,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
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
  requireAllowedFields(body, ['keyword', 'limit', 'language', 'country']);
  const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';
  const limitValue = typeof body.limit === 'number' ? body.limit : Number(body.limit);
  const limit = Number.isFinite(limitValue) ? Math.max(1, Math.min(10, Math.trunc(limitValue))) : 5;
  const language = typeof body.language === 'string' ? body.language.trim() : undefined;
  const country = typeof body.country === 'string' ? body.country.trim() : undefined;

  if (!keyword) {
    throw new RequestValidationError('keyword is required', { field: 'keyword' });
  }

  const liveFeed = await fetchTrendingNewsFeed({
    keyword,
    limit,
    language,
    country,
    timeoutMs: Math.min(trendingNewsPolicy.timeoutMs, 6000)
  });

  return {
    status: 'live_feed',
    keyword: liveFeed.keyword,
    language: liveFeed.language,
    country: liveFeed.country,
    source: 'google_news_rss',
    searchUrl: liveFeed.searchUrl,
    feedUrl: liveFeed.feedUrl,
    feedTitle: liveFeed.feedTitle,
    articleCount: liveFeed.articleCount,
    articles: liveFeed.articles,
    lastBuildDate: liveFeed.lastBuildDate,
    evidence: liveFeed.evidence,
    contract: {
      productLabel: 'Trending News',
      forensicCategory: 'public-api-wrapper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Uses the public Google News RSS search feed to return live article metadata for the supplied keyword. This route does not fetch full article bodies or resolve final publisher URLs beyond the feed metadata.'
    }
  };
});
