import {
  analyzeBbbCompanyEvidence,
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  requireAllowedFields,
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
  requireAllowedFields(body, ['company']);
  const company = typeof body.company === 'string' ? body.company.trim() : '';

  if (!company) {
    throw new RequestValidationError('company is required', { field: 'company' });
  }

  const result = await analyzeBbbCompanyEvidence(company, bbbPolicy.timeoutMs);

  return {
    ...result,
    contract: {
      productLabel: 'BBB Company Evidence (Lite)',
      forensicCategory: 'html-scraper',
      implementationDepth: result.status === 'analyzed' ? 'live' : 'partial',
      launchRecommendation: 'public_lite',
      notes:
        result.status === 'analyzed'
          ? 'Fetches the public BBB search page, parses visible business matches, and enriches the best match with BBB profile metadata, rating evidence, and complaint signals.'
          : 'Fetches the public BBB search page and parses visible business-result cards. If no direct profile match is found, the route returns search evidence only.'
    }
  };
});
