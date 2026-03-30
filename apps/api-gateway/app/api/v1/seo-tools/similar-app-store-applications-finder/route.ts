import {
  createToolPolicy,
  fetchAppStoreSimilarApps,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields,
  optionalStringField
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
  requireAllowedFields(body, ['appId', 'country']);
  const appId = optionalStringField(body, 'appId');
  const country = optionalStringField(body, 'country');

  if (!appId) {
    throw new RequestValidationError('appId is required', { field: 'appId' });
  }

  const similarApps = await fetchAppStoreSimilarApps({
    appId,
    country: country || undefined,
    timeoutMs: Math.min(similarAppsPolicy.timeoutMs, 7000),
    limit: 8
  });

  return {
    ...similarApps,
    contract: {
      productLabel: 'Similar App Store Applications Finder',
      forensicCategory: 'html-scraper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Fetches the public App Store app page and parses the visible “You Might Also Like” shelf plus source-app metadata. It does not access private recommendation APIs or cross-market inventory beyond the requested storefront.'
    }
  };
});
