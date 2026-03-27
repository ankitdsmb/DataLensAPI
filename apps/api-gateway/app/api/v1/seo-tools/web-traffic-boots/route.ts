import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const webTrafficBootsPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 20,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: webTrafficBootsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, webTrafficBootsPolicy);
  const urls = collectUrlInputs(body, webTrafficBootsPolicy);

  return {
    status: 'queued',
    urls
  };
});
