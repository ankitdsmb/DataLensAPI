import {
  createToolPolicy,
  fetchHtmlDocument,
  optionalStringArrayField,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler
} from '@forensic/scraping-core';

const flippaPolicy = createToolPolicy({
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

export const POST = withScrapingHandler({ policy: flippaPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, flippaPolicy);
  const queries = normalizeQueries(body);
  const limit = typeof body.limit === 'number' && Number.isInteger(body.limit) ? Math.min(body.limit, 20) : 10;

  const results = [];

  for (const query of queries) {
    const searchUrl = `https://flippa.com/search?query=${encodeURIComponent(query)}`;
    const { $ } = await fetchHtmlDocument(searchUrl, { timeoutMs: flippaPolicy.timeoutMs });
    const items: Array<{ title: string; url: string }> = [];

    $('a[href*="/listings/"]').each((_, element) => {
      const title = $(element).text().trim();
      const url = $(element).attr('href');
      if (title && url) {
        const absoluteUrl = url.startsWith('http') ? url : `https://flippa.com${url}`;
        items.push({ title, url: absoluteUrl });
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
