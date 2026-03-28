import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields,
  optionalStringField
, enqueueJob
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
  requireAllowedFields(body, ['appId']);
  const appId = optionalStringField(body, 'appId');

  if (!appId) {
    throw new RequestValidationError('appId is required', { field: 'appId' });
  }

  const appUrl = `https://apps.apple.com/app/id${appId}`;

  return { job: enqueueJob('similar-app-store-applications-finder', { appId, appUrl }) };
});
