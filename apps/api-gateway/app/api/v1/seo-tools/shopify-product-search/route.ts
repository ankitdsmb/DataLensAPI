import {
  createToolPolicy,
  searchShopifyProducts,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const shopifyPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: shopifyPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, shopifyPolicy);
  requireAllowedFields(body, ['query', 'storeUrl']);
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const storeUrl = typeof body.storeUrl === 'string' ? body.storeUrl.trim() : '';

  if (!query && !storeUrl) {
    throw new RequestValidationError('query or storeUrl is required', {
      field: 'query',
      alternateField: 'storeUrl'
    });
  }

  if (!storeUrl) {
    const searchUrl = query
      ? `https://www.shopify.com/search?query=${encodeURIComponent(query)}`
      : 'https://www.shopify.com';

    return {
      status: 'store_url_required_for_live_search',
      query: query || null,
      storeUrl: null,
      searchUrl,
      contract: {
        productLabel: 'Shopify Product Search (Helper Fallback)',
        forensicCategory: 'link-builder',
        implementationDepth: 'helper',
        launchRecommendation: 'public_lite',
        notes: 'Provide storeUrl to run live storefront product extraction. Without storeUrl this route only returns a generic Shopify helper URL.'
      }
    };
  }

  const liveSearch = await searchShopifyProducts({
    storeUrl,
    query: query || null,
    timeoutMs: Math.min(shopifyPolicy.timeoutMs, 5000),
    limit: 5
  });

  return {
    status: 'live_search',
    query: liveSearch.query,
    storeUrl: liveSearch.storeUrl,
    source: liveSearch.source,
    sourceUrl: liveSearch.sourceUrl,
    productCount: liveSearch.products.length,
    products: liveSearch.products,
    evidence: liveSearch.evidence,
    contract: {
      productLabel: 'Shopify Product Search',
      forensicCategory: 'public-api-wrapper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Uses public Shopify storefront search/feed endpoints on the supplied storeUrl. If storeUrl is omitted, the route falls back to a generic helper URL only.'
    }
  };
});
