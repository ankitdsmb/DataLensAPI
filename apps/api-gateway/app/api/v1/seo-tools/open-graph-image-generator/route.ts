import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler
} from '@forensic/scraping-core';

const openGraphPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: openGraphPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, openGraphPolicy);
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const subtitle = typeof body.subtitle === 'string' ? body.subtitle.trim() : '';
  const width = typeof body.width === 'number' && body.width > 200 ? Math.round(body.width) : 1200;
  const height = typeof body.height === 'number' && body.height > 200 ? Math.round(body.height) : 630;

  if (!title) {
    throw new RequestValidationError('title is required', { field: 'title' });
  }

  const text = subtitle ? `${title} - ${subtitle}` : title;
  const imageUrl = `https://dummyimage.com/${width}x${height}/0b1220/ffffff&text=${encodeURIComponent(text)}`;

  return {
    title,
    subtitle: subtitle || null,
    width,
    height,
    imageUrl
  };
});
