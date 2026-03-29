import {
  analyzePlagiarismTexts,
  createToolPolicy,
  optionalIntegerField,
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

export const POST = withScrapingHandler({ policy: plagiarismPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, plagiarismPolicy);
  requireAllowedFields(body, ['maxMatches', 'phraseSize', 'text', 'texts']);
  const texts = normalizeTexts(body);
  const analysis = analyzePlagiarismTexts(texts, {
    phraseSize: optionalIntegerField(body, 'phraseSize', { defaultValue: 4, min: 3, max: 8 }),
    maxMatches: optionalIntegerField(body, 'maxMatches', { defaultValue: 5, min: 1, max: 10 })
  });

  return {
    ...analysis,
    contract: {
      productLabel: 'Plagiarism Checker',
      forensicCategory: 'local-utility',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Runs a deterministic local n-gram similarity analysis with repeated-phrase detection, pairwise overlap scoring, and phrase-level evidence. This is a local duplicate-analysis report, not a web-scale plagiarism crawler.'
    }
  };
});
