import {
  createHelperResponse,
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const similarwebPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: similarwebPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, similarwebPolicy);
  requireAllowedFields(body, ['domain']);
  const domain = typeof body.domain === 'string' ? body.domain.trim() : '';

  if (!domain) {
    throw new RequestValidationError('domain is required', { field: 'domain' });
  }

  const reportUrl = `https://www.similarweb.com/website/${domain}/`;

  return createHelperResponse({
    status: 'helper_only',
    source: 'similarweb_report_url',
    fields: {
      domain,
      reportUrl
    },
    contract: {
      productLabel: 'Similarweb Helper (Lite)',
      forensicCategory: 'link-builder',
      implementationDepth: 'helper',
      launchRecommendation: 'internal_or_beta_only',
      notes:
        'Builds a validated Similarweb report URL only. This route does not scrape traffic metrics, keyword data, or audience analytics.'
    }
  });
});
