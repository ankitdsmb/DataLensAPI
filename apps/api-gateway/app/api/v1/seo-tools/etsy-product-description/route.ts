import {
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const etsyPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 3,
  anonymous: true,
  cacheTtlSeconds: 180
});

export const POST = withScrapingHandler({ policy: etsyPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, etsyPolicy);
  requireAllowedFields(body, ['listingId', 'url']);
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const listingId = typeof body.listingId === 'string' ? body.listingId.trim() : '';

  if (!url && !listingId) {
    throw new RequestValidationError('url or listingId is required', {
      field: 'url',
      alternateField: 'listingId'
    });
  }

  const targetUrl = url || `https://www.etsy.com/listing/${listingId}`;
  const { $ } = await fetchHtmlDocument(targetUrl, { timeoutMs: etsyPolicy.timeoutMs });

  const title =
    $('h1[data-buy-box-listing-title]').text().trim()
    || $('h1').first().text().trim()
    || null;
  const price =
    $('[data-buy-box-region="price"]').first().text().trim()
    || $('p[data-buy-box-region="price"]').first().text().trim()
    || null;
  const description =
    $('#description-text').text().trim()
    || $('[data-product-details-description]').text().trim()
    || $('meta[name="description"]').attr('content')?.trim()
    || null;
  const image = $('meta[property="og:image"]').attr('content') || null;

  return {
    url: targetUrl,
    title,
    price,
    description,
    image
  };
});
