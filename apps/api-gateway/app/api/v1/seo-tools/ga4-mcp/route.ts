import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError
, enqueueJob
} from '@forensic/scraping-core';

const ga4Policy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: ga4Policy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, ga4Policy);
  const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : '';
  if (!propertyId) {
    throw new RequestValidationError('propertyId is required', { field: 'propertyId' });
  }

  return { job: enqueueJob('ga4-mcp', { propertyId, message: 'GA4 analysis request accepted. Provide credentials to enable live reporting.' }) };
});
