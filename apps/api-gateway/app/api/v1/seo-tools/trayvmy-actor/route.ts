import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const trayvmyPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 32 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: trayvmyPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, trayvmyPolicy);
  requireAllowedFields(body, []);

  return {
    status: 'queued'
  };
});
