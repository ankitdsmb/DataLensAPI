import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError
} from '@forensic/scraping-core';

const discordForumPolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: discordForumPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, discordForumPolicy);
  const forumUrl = typeof body.forumUrl === 'string' ? body.forumUrl.trim() : '';
  if (!forumUrl) {
    throw new RequestValidationError('forumUrl is required', { field: 'forumUrl' });
  }

  return {
    forumUrl,
    status: 'queued',
    message: 'Static site generation queued for Discord forum.'
  };
});
