import {
  createToolPolicy,
  optionalStringArrayField,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError
} from '@forensic/scraping-core';

const bulkBbbPolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 50,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: bulkBbbPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, bulkBbbPolicy);
  const companies = optionalStringArrayField(body, 'companies', { maxItems: 50, fieldLabel: 'companies' });
  if (companies.length === 0) {
    throw new RequestValidationError('companies is required', { field: 'companies' });
  }

  const results = companies.map((company) => ({
    company,
    searchUrl: `https://www.bbb.org/search?find_text=${encodeURIComponent(company)}`
  }));

  return { results };
});
