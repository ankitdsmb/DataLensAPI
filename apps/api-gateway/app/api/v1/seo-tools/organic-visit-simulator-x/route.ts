import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
, enqueueJob
} from '@forensic/scraping-core';

const organicVisitPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: organicVisitPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, organicVisitPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, organicVisitPolicy);

  return { job: enqueueJob('organic-visit-simulator-x', { urls }) };
});
