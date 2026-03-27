import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler
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
  const urls = collectUrlInputs(body, websiteTrafficProPolicy);

  return {
    status: 'queued',
    urls
  };
});
