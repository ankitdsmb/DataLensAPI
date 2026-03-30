import {
  collectUrlInputs,
  createToolPolicy,
  inspectGa4McpTagEvidence,
  optionalStringField,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const ga4Policy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: ga4Policy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, ga4Policy);
  requireAllowedFields(body, ['url', 'urls', 'propertyId']);
  const urls = collectUrlInputs(body, ga4Policy);
  const propertyId = optionalStringField(body, 'propertyId');

  const results = [];

  for (const url of urls) {
    results.push(await inspectGa4McpTagEvidence({
      url,
      timeoutMs: ga4Policy.timeoutMs,
      propertyId
    }));
  }

  const analyzedCount = results.filter((result) => result.status === 'analyzed').length;

  return {
    status: 'analyzed',
    mode: 'tag_detection',
    requestedCount: urls.length,
    analyzedCount,
    errorCount: results.length - analyzedCount,
    requestedPropertyId: propertyId || null,
    results,
    contract: {
      productLabel: 'GA4 MCP (Tag Detection Lite)',
      forensicCategory: 'html-scraper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Fetches public HTML and inspects GA4 measurement ids, gtag/GTM loaders, and related analytics signals for the supplied URLs. This route does not access authenticated Google Analytics reporting APIs or MCP sessions.'
    }
  };
});
