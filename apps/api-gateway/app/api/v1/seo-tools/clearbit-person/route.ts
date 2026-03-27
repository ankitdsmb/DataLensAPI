import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  stealthGet
} from '@forensic/scraping-core';

const clearbitPersonPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: clearbitPersonPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, clearbitPersonPolicy);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    throw new RequestValidationError('name is required', { field: 'name' });
  }

  const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(name)}`;
  const response = await stealthGet(url, { timeoutMs: clearbitPersonPolicy.timeoutMs, throwHttpErrors: false });
  const data = response.body ? JSON.parse(response.body) : [];

  return {
    name,
    suggestions: data
  };
});
