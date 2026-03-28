import {
  createToolPolicy,
  optionalStringArrayField,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  requireAllowedFields
} from '@forensic/scraping-core';

const topicTrendPolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: topicTrendPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, topicTrendPolicy);
  requireAllowedFields(body, ['topics']);
  const topics = optionalStringArrayField(body, 'topics', { maxItems: 50, fieldLabel: 'topics' });
  if (topics.length === 0) {
    throw new RequestValidationError('topics is required', { field: 'topics' });
  }

  const normalized = topics.map((topic) => ({
    topic,
    score: Math.max(1, Math.min(100, topic.length * 3))
  }));

  return {
    topics: normalized.sort((a, b) => b.score - a.score)
  };
});
