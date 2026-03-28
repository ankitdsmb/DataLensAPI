import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
, enqueueJob
} from '@forensic/scraping-core';

const websiteTrafficProPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 20,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: websiteTrafficProPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, websiteTrafficProPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, websiteTrafficProPolicy);

  return { job: enqueueJob('website-traffic-generator-pro', { urls }) };
});
