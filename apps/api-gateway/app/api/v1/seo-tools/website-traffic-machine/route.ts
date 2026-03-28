import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler
, enqueueJob
} from '@forensic/scraping-core';

const websiteTrafficMachinePolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 20,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: websiteTrafficMachinePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, websiteTrafficMachinePolicy);
  const urls = collectUrlInputs(body, websiteTrafficMachinePolicy);

  return { job: enqueueJob('website-traffic-machine', { urls }) };
});
