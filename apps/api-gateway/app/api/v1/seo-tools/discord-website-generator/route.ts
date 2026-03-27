import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError
} from '@forensic/scraping-core';

const discordWebsitePolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: discordWebsitePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, discordWebsitePolicy);
  const serverUrl = typeof body.serverUrl === 'string' ? body.serverUrl.trim() : '';
  if (!serverUrl) {
    throw new RequestValidationError('serverUrl is required', { field: 'serverUrl' });
  }

  return {
    serverUrl,
    status: 'queued',
    message: 'Landing page generation queued for Discord server.'
  };
});
