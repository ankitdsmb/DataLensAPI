import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError
} from '@forensic/scraping-core';

const spellCheckerPolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

const COMMON_WORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'you', 'your', 'are', 'was',
  'but', 'not', 'all', 'can', 'our', 'out', 'has', 'have', 'will', 'into', 'about'
]);

export const POST = withScrapingHandler({ policy: spellCheckerPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, spellCheckerPolicy);
  const text = typeof body.text === 'string' ? body.text : '';
  if (!text) {
    throw new RequestValidationError('text is required', { field: 'text' });
  }

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const suspects = Array.from(new Set(words.filter((word) => {
    if (COMMON_WORDS.has(word)) return false;
    if (word.length > 18) return true;
    if (/\d/.test(word)) return true;
    if (/(.)\1\1/.test(word)) return true;
    return false;
  })));

  return {
    suspects,
    suspectCount: suspects.length
  };
});
