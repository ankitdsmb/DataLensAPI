import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  stealthGet
,
  safeJsonParse,
  requireAllowedFields
} from '@forensic/scraping-core';

const companyDomainPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: companyDomainPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, companyDomainPolicy);
  requireAllowedFields(body, ['company']);
  const company = typeof body.company === 'string' ? body.company.trim() : '';
  if (!company) {
    throw new RequestValidationError('company is required', { field: 'company' });
  }

  const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(company)}`;
  const response = await stealthGet(url, { timeoutMs: companyDomainPolicy.timeoutMs, throwHttpErrors: false });
  const data = response.body ? safeJsonParse<Record<string, unknown>>(response.body) : [];

  return {
    company,
    suggestions: data
  };
});
