import {
  createHelperResponse,
  createToolPolicy,
  optionalStringArrayField,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const spyfuBulkPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

function normalizeDomains(body: Record<string, unknown>) {
  const domains = optionalStringArrayField(body, 'domains', { maxItems: 50, fieldLabel: 'domains' });
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

export const POST = withScrapingHandler({ policy: spyfuBulkPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, spyfuBulkPolicy);
  requireAllowedFields(body, ['domain', 'domains']);
  const domains = normalizeDomains(body);

  const results = domains.map((domain) => ({
    domain,
    reportUrl: `https://www.spyfu.com/overview/domain?query=${encodeURIComponent(domain)}`
  }));

  return createHelperResponse({
    status: 'compatibility_wrapper',
    source: 'spyfu_report_url',
    fields: {
      compatibilityTarget: '/api/v1/seo-tools/spyfu',
      resultCount: results.length,
      results
    },
    contract: {
      productLabel: 'SpyFu Bulk URLs Helper (Compatibility)',
      forensicCategory: 'link-builder',
      implementationDepth: 'helper',
      launchRecommendation: 'internal_or_beta_only',
      notes:
        'Compatibility wrapper that emits normalized SpyFu report URLs in bulk. It does not perform live SpyFu data extraction.'
    }
  });
});
