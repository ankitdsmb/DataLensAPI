import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler
} from '@forensic/scraping-core';

const bbbPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: bbbPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, bbbPolicy);
  const company = typeof body.company === 'string' ? body.company.trim() : '';

  if (!company) {
    throw new RequestValidationError('company is required', { field: 'company' });
  }

  const searchUrl = `https://www.bbb.org/search?find_text=${encodeURIComponent(company)}`;

  return {
    company,
    searchUrl
  };
});
