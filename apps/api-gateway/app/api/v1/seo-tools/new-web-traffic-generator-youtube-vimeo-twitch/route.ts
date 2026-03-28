import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
, enqueueJob
} from '@forensic/scraping-core';

const newWebTrafficPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 20,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: newWebTrafficPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, newWebTrafficPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, newWebTrafficPolicy);

  return { job: enqueueJob('new-web-traffic-generator-youtube-vimeo-twitch', { urls }) };
});
