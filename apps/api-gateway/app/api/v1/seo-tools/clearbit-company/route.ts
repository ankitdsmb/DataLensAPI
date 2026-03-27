import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  stealthGet
} from '@forensic/scraping-core';

const clearbitCompanyPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: clearbitCompanyPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, clearbitCompanyPolicy);
  const domain = typeof body.domain === 'string' ? body.domain.trim() : '';
  if (!domain) {
    throw new RequestValidationError('domain is required', { field: 'domain' });
  }

  const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(domain)}`;
  const response = await stealthGet(url, { timeoutMs: clearbitCompanyPolicy.timeoutMs, throwHttpErrors: false });
  const data = response.body ? JSON.parse(response.body) : [];

  return {
    domain,
    suggestions: data
  };
});
