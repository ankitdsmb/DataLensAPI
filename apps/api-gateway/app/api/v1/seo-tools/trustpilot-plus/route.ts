import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const trustpilotPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: trustpilotPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, trustpilotPolicy);
  requireAllowedFields(body, ['company']);
  const company = typeof body.company === 'string' ? body.company.trim() : '';

  if (!company) {
    throw new RequestValidationError('company is required', { field: 'company' });
  }

  const searchUrl = `https://www.trustpilot.com/search?query=${encodeURIComponent(company)}`;

  return {
    company,
    searchUrl
  };
});
