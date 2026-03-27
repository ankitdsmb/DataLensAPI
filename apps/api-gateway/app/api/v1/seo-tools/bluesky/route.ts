import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler
} from '@forensic/scraping-core';

const blueskyPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 180
});

function normalizeProfileUrls(body: Record<string, unknown>) {
  const urls = collectUrlInputs(body, blueskyPolicy);
  const handle = typeof body.handle === 'string' ? body.handle.trim() : '';
  const profileUrl = handle ? `https://bsky.app/profile/${handle}` : '';

  if (urls.length === 0 && !profileUrl) {
    throw new RequestValidationError('url or handle is required', {
      field: 'url',
      alternateField: 'handle'
    });
  }

  return [...urls, ...(profileUrl ? [profileUrl] : [])];
}

export const POST = withScrapingHandler({ policy: blueskyPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, blueskyPolicy);
  const urls = normalizeProfileUrls(body);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: blueskyPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const description =
      $('meta[property="og:description"]').attr('content')?.trim()
      || $('meta[name="description"]').attr('content')?.trim()
      || null;
    const canonical = $('link[rel="canonical"]').attr('href') || url;

    results.push({
      url,
      canonical,
      title,
      description
    });
  }

  return { results };
});
