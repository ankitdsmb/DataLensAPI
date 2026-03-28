import {
  createToolPolicy,
  optionalStringArrayField,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const plagiarismPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 128 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

function normalizeTexts(body: Record<string, unknown>) {
  const texts = optionalStringArrayField(body, 'texts', { maxItems: 5, fieldLabel: 'texts' });
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

  return combined;
}

function analyzeText(content: string) {
  const words = content.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  const totalWords = words.length;
  const uniqueWords = new Set(words).size;
  const duplicateRatio = totalWords === 0 ? 0 : (totalWords - uniqueWords) / totalWords;
  const sentences = content.split(/[.!?]+/).map((sentence) => sentence.trim()).filter(Boolean);
  const sentenceCount = sentences.length;

  return {
    totalWords,
    uniqueWords,
    duplicateRatio: Number(duplicateRatio.toFixed(4)),
    sentenceCount
  };
}

export const POST = withScrapingHandler({ policy: plagiarismPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, plagiarismPolicy);
  requireAllowedFields(body, ['text', 'texts']);
  const texts = normalizeTexts(body);

  const results = texts.map((text) => {
    const analysis = analyzeText(text);
    return {
      input: text,
      similarityScore: Math.round(analysis.duplicateRatio * 100),
      ...analysis
    };
  });

  return {
    method: 'heuristic-duplicate-ratio',
    results
  };
});
