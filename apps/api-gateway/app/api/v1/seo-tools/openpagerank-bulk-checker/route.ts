import {
  createToolPolicy,
  optionalStringArrayField,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const openPageRankPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

function normalizeDomains(body: Record<string, unknown>) {
  const domains = optionalStringArrayField(body, 'domains', { maxItems: 200, fieldLabel: 'domains' });
  const domain = typeof body.domain === 'string' ? body.domain.trim() : '';
  const combined = [
    ...(domain ? [domain] : []),
    ...domains
  ];

  if (combined.length === 0) {
    throw new RequestValidationError('domain or domains is required', {
      field: 'domain',
      alternateField: 'domains'
    });
  }

  return Array.from(new Set(combined));
}

export const POST = withScrapingHandler({ policy: openPageRankPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, openPageRankPolicy);
  requireAllowedFields(body, ['domain', 'domains']);
  const domains = normalizeDomains(body);

  const results = domains.map((domain) => ({
    domain,
    oprScore: null,
    status: 'pending_api_key'
  }));

  return { results };
});
