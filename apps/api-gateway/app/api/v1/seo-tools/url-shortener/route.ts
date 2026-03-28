import {
  createToolPolicy,
  optionalStringArrayField,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  stealthGet,
  requireAllowedFields
} from '@forensic/scraping-core';

const urlShortenerPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 5,
  maxBulkItems: 5,
  anonymous: true,
  cacheTtlSeconds: 120
});

function normalizeUrls(body: Record<string, unknown>) {
  const urls = optionalStringArrayField(body, 'urls', { maxItems: urlShortenerPolicy.maxBulkItems, fieldLabel: 'urls' });
  const singleUrl = typeof body.url === 'string' ? body.url.trim() : '';
  const combined = [
    ...(singleUrl ? [singleUrl] : []),
    ...urls
  ];

  if (combined.length === 0) {
    throw new RequestValidationError('url or urls is required', {
      field: 'url',
      alternateField: 'urls'
    });
  }
  if (combined.length > urlShortenerPolicy.maxBulkItems) {
    throw new RequestValidationError('urls exceeds the allowed item limit', {
      field: 'urls',
      maxBulkItems: urlShortenerPolicy.maxBulkItems
    });
  }

  return Array.from(new Set(combined));
}

export const POST = withScrapingHandler({ policy: urlShortenerPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, urlShortenerPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = normalizeUrls(body);

  const results = [];

  for (const url of urls) {
    const response = await stealthGet(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, {
      timeoutMs: urlShortenerPolicy.timeoutMs,
      throwHttpErrors: false
    });
    const shortUrl = response.body.trim();
    results.push({ url, shortUrl });
  }

  return { results };
});
