import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler
, enqueueJob
} from '@forensic/scraping-core';

const websitesTrafficPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 20,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: websitesTrafficPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, websitesTrafficPolicy);
  const urls = collectUrlInputs(body, websitesTrafficPolicy);

  return { job: enqueueJob('websites-traffic-generator', { urls }) };
});
