import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler
, enqueueJob
} from '@forensic/scraping-core';

const snapifyPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: snapifyPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, snapifyPolicy);
  const urls = collectUrlInputs(body, snapifyPolicy);

  return { job: enqueueJob('snapify-capture-screenshot-save-pdf', { urls }) };
});
