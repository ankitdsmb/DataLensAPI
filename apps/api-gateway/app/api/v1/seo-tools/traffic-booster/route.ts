import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';
import { jobToEnvelope, submitJob } from '@/lib/jobs/runtime';

const trafficBoosterPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 20,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: trafficBoosterPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, trafficBoosterPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, trafficBoosterPolicy);

  const job = await submitJob('traffic-booster', { urls });

  return {
    status: 'queued',
    urls,
    job: jobToEnvelope(job)
  };
});
