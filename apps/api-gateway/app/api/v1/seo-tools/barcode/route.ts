import {
  lookupBarcodeProduct,
  createToolPolicy,
  optionalStringField,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const barcodePolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: barcodePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, barcodePolicy);
  requireAllowedFields(body, ['code']);
  const result = await lookupBarcodeProduct({
    code: optionalStringField(body, 'code'),
    timeoutMs: Math.min(barcodePolicy.timeoutMs, 9000)
  });

  return {
    ...result,
    contract: {
      productLabel: 'Barcode Lookup',
      forensicCategory: 'public-api-wrapper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Uses the public OpenFoodFacts product API for barcode evidence and falls back to the public product page when the API is rate-limited. Coverage still depends on products present in that public catalog, so missing items return an honest not_found response.'
    }
  };
});
