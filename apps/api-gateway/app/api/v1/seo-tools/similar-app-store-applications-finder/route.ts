import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler
} from '@forensic/scraping-core';

const similarAppsPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: similarAppsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, similarAppsPolicy);
  const appId = typeof body.appId === 'string' ? body.appId.trim() : '';

  if (!appId) {
    throw new RequestValidationError('appId is required', { field: 'appId' });
  }

  const appUrl = `https://apps.apple.com/app/id${appId}`;

  return {
    appId,
    appUrl,
    status: 'queued'
  };
});
