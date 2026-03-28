import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
, enqueueJob
} from '@forensic/scraping-core';

const smartTrafficPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 20,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: smartTrafficPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, smartTrafficPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, smartTrafficPolicy);

  return { job: enqueueJob('smart-website-traffic', { urls }) };
});
