import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const quickLhPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: quickLhPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, quickLhPolicy);
  const urls = collectUrlInputs(body, quickLhPolicy);

  return {
    status: 'queued',
    urls
  };
});
