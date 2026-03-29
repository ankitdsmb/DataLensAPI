import {
  createHelperResponse,
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const spyfuPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: spyfuPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, spyfuPolicy);
  requireAllowedFields(body, ['domain']);
  const domain = typeof body.domain === 'string' ? body.domain.trim() : '';

  if (!domain) {
    throw new RequestValidationError('domain is required', { field: 'domain' });
  }

  const reportUrl = `https://www.spyfu.com/overview/domain?query=${encodeURIComponent(domain)}`;

  return createHelperResponse({
    status: 'helper_only',
    source: 'spyfu_report_url',
    fields: {
      domain,
      reportUrl
    },
    contract: {
      productLabel: 'SpyFu Helper (Lite)',
      forensicCategory: 'link-builder',
      implementationDepth: 'helper',
      launchRecommendation: 'internal_or_beta_only',
      notes:
        'Builds a normalized SpyFu domain report URL only. This route does not fetch keyword, PPC, ranking, or competitor data.'
    }
  });
});
