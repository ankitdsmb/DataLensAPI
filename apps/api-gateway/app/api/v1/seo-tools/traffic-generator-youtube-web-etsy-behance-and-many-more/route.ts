import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const trafficGeneratorPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 20,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: trafficGeneratorPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, trafficGeneratorPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, trafficGeneratorPolicy);

  return {
    status: 'queued',
    urls
  };
});
