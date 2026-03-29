import {
  aggregateTopicTrends,
  createToolPolicy,
  optionalIntegerField,
  optionalStringArrayField,
  readJsonBody,
  withScrapingHandler,
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
  requireAllowedFields(body, ['topN', 'topics']);
  const topics = optionalStringArrayField(body, 'topics', { maxItems: 50, fieldLabel: 'topics' });
  const result = aggregateTopicTrends(topics, {
    topN: optionalIntegerField(body, 'topN', { defaultValue: 10, min: 1, max: 20 })
  });

  return {
    ...result,
    contract: {
      productLabel: 'Topic Trend Aggregator',
      forensicCategory: 'local-utility',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Runs a deterministic topic-clustering engine over supplied phrases, grouping overlapping themes and scoring trend momentum signals from variant frequency and modifiers. This is a local aggregation utility, not a live news-ingestion pipeline.'
    }
  };
});
