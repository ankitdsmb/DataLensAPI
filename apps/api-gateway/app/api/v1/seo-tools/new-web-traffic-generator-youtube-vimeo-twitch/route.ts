import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler
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
  const urls = collectUrlInputs(body, newWebTrafficPolicy);

  return {
    status: 'queued',
    urls
  };
});
