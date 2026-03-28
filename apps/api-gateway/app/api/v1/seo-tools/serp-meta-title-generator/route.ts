import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  requireAllowedFields
} from '@forensic/scraping-core';

const serpTitlePolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: serpTitlePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, serpTitlePolicy);
  requireAllowedFields(body, ['brand', 'keyword']);
  const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';
  const brand = typeof body.brand === 'string' ? body.brand.trim() : '';

  if (!keyword) {
    throw new RequestValidationError('keyword is required', { field: 'keyword' });
  }

  const templates = [
    `${keyword} Guide`,
    `Best ${keyword} in 2026`,
    `${keyword} Checklist`,
    `${keyword} Tips & Examples`,
    `${keyword} for Teams`
  ];

  const titles = templates
    .map((title) => (brand ? `${title} | ${brand}` : title))
    .map((title) => title.slice(0, 60));

  return { keyword, titles };
});
