import {
  createToolPolicy,
  optionalStringArrayField,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError
} from '@forensic/scraping-core';

const hashtagPolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

function normalizeKeywords(body: Record<string, unknown>) {
  const keywords = optionalStringArrayField(body, 'keywords', { maxItems: 50, fieldLabel: 'keywords' });
  if (keywords.length === 0) {
    throw new RequestValidationError('keywords is required', { field: 'keywords' });
  }
  return keywords;
}

export const POST = withScrapingHandler({ policy: hashtagPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, hashtagPolicy);
  const keywords = normalizeKeywords(body);

  const hashtags = Array.from(new Set(
    keywords.flatMap((keyword) => {
      const tokens = keyword
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(Boolean);
      return [
        `#${tokens.join('')}`,
        ...tokens.map((token) => `#${token}`)
      ];
    })
  ));

  return {
    hashtags,
    count: hashtags.length
  };
});
