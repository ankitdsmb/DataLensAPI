import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler
} from '@forensic/scraping-core';

const seobilityRankingPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: seobilityRankingPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, seobilityRankingPolicy);
  const domain = typeof body.domain === 'string' ? body.domain.trim() : '';

  if (!domain) {
    throw new RequestValidationError('domain is required', { field: 'domain' });
  }

  return {
    domain,
    status: 'queued'
  };
});
