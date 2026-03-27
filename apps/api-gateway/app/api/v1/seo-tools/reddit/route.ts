import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  stealthGet,
  withScrapingHandler
} from '@forensic/scraping-core';

const redditPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: redditPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, redditPolicy);
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const subreddit = typeof body.subreddit === 'string' ? body.subreddit.trim() : '';
  const limit = typeof body.limit === 'number' && Number.isInteger(body.limit) ? Math.min(body.limit, 25) : 10;

  if (!query && !subreddit) {
    throw new RequestValidationError('query or subreddit is required', {
      field: 'query',
      alternateField: 'subreddit'
    });
  }

  const endpoint = subreddit
    ? `https://www.reddit.com/r/${encodeURIComponent(subreddit)}.json?limit=${limit}`
    : `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=${limit}`;

  const response = await stealthGet(endpoint, {
    timeoutMs: redditPolicy.timeoutMs,
    throwHttpErrors: false
  });
  const payload = response.body ? JSON.parse(response.body) : null;
  const children = payload?.data?.children ?? [];
  const items = Array.isArray(children)
    ? children.map((child: { data?: Record<string, unknown> }) => {
      const data = child.data ?? {};
      return {
        id: data.id ?? null,
        title: data.title ?? null,
        url: data.url ?? null,
        score: data.score ?? null,
        author: data.author ?? null,
        subreddit: data.subreddit ?? null
      };
    })
    : [];

  return {
    query: query || null,
    subreddit: subreddit || null,
    items
  };
});
