import { RequestValidationError } from '../validation';

type TopicTrendOptions = {
  topN?: number;
};

type TopicEntry = {
  raw: string;
  normalized: string;
  tokens: string[];
  coreTokens: string[];
};

type TopicCluster = {
  key: string;
  entries: TopicEntry[];
  coreTokens: Set<string>;
  tokenCounts: Map<string, number>;
};

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'best',
  'by',
  'for',
  'from',
  'how',
  'in',
  'into',
  'is',
  'it',
  'new',
  'of',
  'on',
  'or',
  'the',
  'to',
  'what',
  'with'
]);

const MODIFIER_TOKENS = new Set([
  'checklist',
  'compare',
  'comparison',
  'examples',
  'explained',
  'guide',
  'latest',
  'pricing',
  'questions',
  'strategy',
  'tips',
  'trends'
]);

const FRESHNESS_TOKENS = new Set(['current', 'latest', 'new', 'now', 'today', 'trending', '2025', '2026']);
const ACRONYM_TOKENS = new Set(['ai', 'aeo', 'ga4', 'geo', 'seo']);

function normalizeTopic(topic: string) {
  return topic
    .trim()
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function tokenize(topic: string) {
  return normalizeTopic(topic)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function getCoreTokens(tokens: string[]) {
  const filtered = tokens.filter(
    (token) => (token.length > 2 || ACRONYM_TOKENS.has(token)) && !STOPWORDS.has(token) && !MODIFIER_TOKENS.has(token)
  );
  return Array.from(new Set(filtered));
}

function toDisplayTopic(tokens: string[]) {
  return tokens
    .map((token) => {
      if (token === 'ai' || token === 'seo' || token === 'geo' || token === 'aeo') {
        return token.toUpperCase();
      }

      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join(' ');
}

function createEntry(topic: string): TopicEntry {
  const normalized = normalizeTopic(topic);
  const tokens = tokenize(topic);
  const coreTokens = getCoreTokens(tokens);

  return {
    raw: topic.trim(),
    normalized,
    tokens,
    coreTokens
  };
}

function findCluster(clusters: TopicCluster[], entry: TopicEntry) {
  let bestCluster: TopicCluster | null = null;
  let bestScore = 0;

  for (const cluster of clusters) {
    const overlap = entry.coreTokens.filter((token) => cluster.coreTokens.has(token));
    const unionSize = new Set([...entry.coreTokens, ...cluster.coreTokens]).size || 1;
    const score = overlap.length / unionSize;
    const subsetMatch =
      overlap.length >= 2 &&
      (overlap.length === entry.coreTokens.length || overlap.length === cluster.coreTokens.size);

    if ((score >= 0.5 || subsetMatch) && overlap.length >= 2 && score >= bestScore) {
      bestCluster = cluster;
      bestScore = score;
    }
  }

  return bestCluster;
}

function buildCluster(entries: TopicEntry[]): TopicCluster {
  const tokenCounts = new Map<string, number>();
  const coreTokens = new Set<string>();

  for (const entry of entries) {
    for (const token of entry.coreTokens) {
      coreTokens.add(token);
      tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
    }
  }

  const sortedCore = [...tokenCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([token]) => token);

  return {
    key: sortedCore.slice(0, 4).join(' '),
    entries,
    coreTokens: new Set(sortedCore),
    tokenCounts
  };
}

function mergeTopics(entries: TopicEntry[]) {
  const clusters: TopicCluster[] = [];

  for (const entry of entries) {
    const cluster = findCluster(clusters, entry);
    if (cluster) {
      cluster.entries.push(entry);
      for (const token of entry.coreTokens) {
        cluster.coreTokens.add(token);
        cluster.tokenCounts.set(token, (cluster.tokenCounts.get(token) ?? 0) + 1);
      }
      continue;
    }

    clusters.push(buildCluster([entry]));
  }

  return clusters;
}

function buildMomentumSignals(cluster: TopicCluster) {
  const freshnessCueCount = cluster.entries.filter((entry) => entry.tokens.some((token) => FRESHNESS_TOKENS.has(token))).length;
  const questionCount = cluster.entries.filter((entry) => entry.raw.includes('?')).length;
  const modifierSet = new Set<string>();

  for (const entry of cluster.entries) {
    for (const token of entry.tokens) {
      if (MODIFIER_TOKENS.has(token)) {
        modifierSet.add(token);
      }
    }
  }

  return {
    freshnessCueCount,
    modifierDiversity: modifierSet.size,
    questionCount,
    modifiers: [...modifierSet].sort()
  };
}

function scoreCluster(cluster: TopicCluster) {
  const mentions = cluster.entries.length;
  const variants = new Set(cluster.entries.map((entry) => entry.normalized)).size;
  const signals = buildMomentumSignals(cluster);
  const base = mentions * 20 + variants * 8 + signals.modifierDiversity * 6 + signals.freshnessCueCount * 4 + signals.questionCount * 2;
  return Math.max(1, Math.min(100, base));
}

function summarizeCluster(cluster: TopicCluster) {
  const sortedTokens = [...cluster.tokenCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([token]) => token);
  const primaryTokens = sortedTokens.slice(0, Math.min(4, sortedTokens.length));
  const variants = Array.from(new Set(cluster.entries.map((entry) => entry.raw))).sort((left, right) => left.length - right.length);
  const canonicalVariant = variants[0] ?? cluster.entries[0]?.raw ?? cluster.key;
  const canonicalTokens = getCoreTokens(tokenize(canonicalVariant));
  const momentumSignals = buildMomentumSignals(cluster);

  return {
    topic: toDisplayTopic(canonicalTokens.length > 0 ? canonicalTokens : primaryTokens),
    trendScore: scoreCluster(cluster),
    mentions: cluster.entries.length,
    variantCount: variants.length,
    sharedTokens: primaryTokens,
    representativePhrases: variants.slice(0, 5),
    momentumSignals
  };
}

export function aggregateTopicTrends(topicsInput: string[], options: TopicTrendOptions = {}) {
  const topics = Array.from(new Set(topicsInput.map((topic) => topic.trim()).filter(Boolean)));
  if (topics.length === 0) {
    throw new RequestValidationError('topics is required', { field: 'topics' });
  }

  const topN = Math.max(1, Math.min(options.topN ?? 10, 20));
  const entries = topics.map(createEntry);
  const clusters = mergeTopics(entries);
  const trends = clusters
    .map(summarizeCluster)
    .sort((left, right) => right.trendScore - left.trendScore || right.mentions - left.mentions || left.topic.localeCompare(right.topic))
    .slice(0, topN);

  const topKeywords = [...entries.flatMap((entry) => entry.coreTokens)].reduce<Map<string, number>>((counts, token) => {
    counts.set(token, (counts.get(token) ?? 0) + 1);
    return counts;
  }, new Map());

  return {
    status: 'aggregated' as const,
    trendCount: trends.length,
    trends,
    evidence: {
      inputTopicCount: topics.length,
      clusteredTopicCount: clusters.length,
      mergedTopicCount: topics.length - clusters.length,
      topKeywords: [...topKeywords.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 8)
        .map(([token, count]) => ({ token, count }))
    }
  };
}
