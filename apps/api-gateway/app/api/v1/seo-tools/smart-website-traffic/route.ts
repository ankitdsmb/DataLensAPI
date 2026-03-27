import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler
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
  const urls = collectUrlInputs(body, smartTrafficPolicy);

  return {
    status: 'queued',
    urls
  };
});
