import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const woorankPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: woorankPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, woorankPolicy);
  const urls = collectUrlInputs(body, woorankPolicy);

  return {
    status: 'queued',
    urls
  };
});
