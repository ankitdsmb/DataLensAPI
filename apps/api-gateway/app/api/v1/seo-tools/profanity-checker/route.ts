import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError
} from '@forensic/scraping-core';

const profanityPolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

const BLOCKLIST = ['badword', 'offensive', 'obscene'];

export const POST = withScrapingHandler({ policy: profanityPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, profanityPolicy);
  const text = typeof body.text === 'string' ? body.text : '';
  if (!text) {
    throw new RequestValidationError('text is required', { field: 'text' });
  }

  const lower = text.toLowerCase();
  const matches = BLOCKLIST.filter((word) => lower.includes(word));
  const cleaned = BLOCKLIST.reduce((current, word) => current.replace(new RegExp(word, 'gi'), '***'), text);

  return {
    matches,
    matchCount: matches.length,
    cleaned
  };
});
