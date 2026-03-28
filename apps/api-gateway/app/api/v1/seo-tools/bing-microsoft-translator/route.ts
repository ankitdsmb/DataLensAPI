import {
  createToolPolicy,
  optionalStringArrayField,
  readJsonBody,
  RequestValidationError,
  stealthGet,
  withScrapingHandler
,
  safeJsonParse} from '@forensic/scraping-core';

const translatorPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

function normalizeTexts(body: Record<string, unknown>) {
  const texts = optionalStringArrayField(body, 'texts', { maxItems: 10, fieldLabel: 'texts' });
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const combined = [
    ...(text ? [text] : []),
    ...texts
  ];

  if (combined.length === 0) {
    throw new RequestValidationError('text or texts is required', {
      field: 'text',
      alternateField: 'texts'
    });
  }

  return Array.from(new Set(combined));
}

export const POST = withScrapingHandler({ policy: translatorPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, translatorPolicy);
  const texts = normalizeTexts(body);
  const from = typeof body.from === 'string' && body.from.trim() ? body.from.trim() : 'en';
  const to = typeof body.to === 'string' && body.to.trim() ? body.to.trim() : 'es';

  const results = [];

  for (const input of texts) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(input)}&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`;
    const response = await stealthGet(url, {
      timeoutMs: translatorPolicy.timeoutMs,
      throwHttpErrors: false
    });
    const payload = response.body ? safeJsonParse<Record<string, unknown>>(response.body) : null;
    const translatedText = ((payload?.responseData as Record<string, unknown>)?.translatedText as string) ?? null;

    results.push({
      input,
      translatedText,
      provider: 'mymemory'
    });
  }

  return {
    from,
    to,
    results
  };
});
