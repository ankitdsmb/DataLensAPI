import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler
} from '@forensic/scraping-core';

const xTwitterPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: xTwitterPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, xTwitterPolicy);
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const username = typeof body.username === 'string' ? body.username.trim() : '';

  if (!query && !username) {
    throw new RequestValidationError('query or username is required', {
      field: 'query',
      alternateField: 'username'
    });
  }

  const searchUrl = query ? `https://x.com/search?q=${encodeURIComponent(query)}` : null;
  const profileUrl = username ? `https://x.com/${encodeURIComponent(username)}` : null;

  return {
    query: query || null,
    username: username || null,
    searchUrl,
    profileUrl
  };
});
