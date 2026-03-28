import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler
, enqueueJob
} from '@forensic/scraping-core';

const trafficBoosterPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 20,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: trafficBoosterPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, trafficBoosterPolicy);
  const urls = collectUrlInputs(body, trafficBoosterPolicy);

  return { job: enqueueJob('traffic-booster', { urls }) };
});
