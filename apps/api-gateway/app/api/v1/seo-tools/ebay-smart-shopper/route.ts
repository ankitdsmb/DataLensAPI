import {
  createToolPolicy,
  fetchHtmlDocument,
  optionalStringArrayField,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const ebayShopperPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

function normalizeQueries(body: Record<string, unknown>) {
  const queries = optionalStringArrayField(body, 'queries', { maxItems: 5, fieldLabel: 'queries' });
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const combined = [
    ...(query ? [query] : []),
    ...queries
  ];

  if (combined.length === 0) {
    throw new RequestValidationError('query or queries is required', {
      field: 'query',
      alternateField: 'queries'
    });
  }

  return Array.from(new Set(combined));
}

export const POST = withScrapingHandler({ policy: ebayShopperPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, ebayShopperPolicy);
  requireAllowedFields(body, ['limit', 'queries', 'query']);
  const queries = normalizeQueries(body);
  const limit = typeof body.limit === 'number' && Number.isInteger(body.limit) ? Math.min(body.limit, 20) : 10;

  const results = [];

  for (const query of queries) {
    const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
    const { $ } = await fetchHtmlDocument(searchUrl, { timeoutMs: ebayShopperPolicy.timeoutMs });
    const items: Array<{ title: string; price: string | null; url: string }> = [];

    $('.s-item').each((_, element) => {
      const title = $(element).find('.s-item__title').first().text().trim();
      const price = $(element).find('.s-item__price').first().text().trim();
      const url = $(element).find('a.s-item__link').attr('href');
      if (title && url) {
        items.push({ title, price: price || null, url });
      }
    });

    results.push({
      query,
      searchUrl,
      items: items.slice(0, limit)
    });
  }

  return { results };
});
