import {
  checkSpellingWithLanguageTool,
  createToolPolicy,
  optionalStringField,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const spellCheckerPolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: spellCheckerPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, spellCheckerPolicy);
  requireAllowedFields(body, ['language', 'text']);

  const liveCheck = await checkSpellingWithLanguageTool({
    text: optionalStringField(body, 'text'),
    language: optionalStringField(body, 'language', '') || null,
    timeoutMs: Math.min(spellCheckerPolicy.timeoutMs, 6000)
  });

  return {
    ...liveCheck,
    contract: {
      productLabel: 'Spell Checker',
      forensicCategory: 'public-api-wrapper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Uses the public LanguageTool endpoint to return real spelling and grammar match evidence for capped text inputs. This is evidence-grade checking, not a rewrite or style-optimization engine.'
    }
  };
});
