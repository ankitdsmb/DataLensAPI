type TextAnalysis = {
  input: string;
  totalWords: number;
  uniqueWords: number;
  duplicateRatio: number;
  sentenceCount: number;
  repeatedPhraseCount: number;
  topRepeatedPhrases: Array<{ phrase: string; count: number }>;
  internalSimilarityScore: number;
};

type PairwiseMatch = {
  leftIndex: number;
  rightIndex: number;
  similarityScore: number;
  sharedPhraseCount: number;
  sharedPhrases: string[];
};

function tokenize(content: string) {
  return content.toLowerCase().match(/[a-z0-9']+/g) ?? [];
}

function buildNgrams(tokens: string[], size: number) {
  const counts = new Map<string, number>();

  for (let index = 0; index <= tokens.length - size; index += 1) {
    const phrase = tokens.slice(index, index + size).join(' ');
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }

  return counts;
}

function toPercentage(value: number) {
  return Math.round(value * 100);
}

function analyzeSingleText(content: string, phraseSize: number, maxMatches: number): TextAnalysis {
  const tokens = tokenize(content);
  const totalWords = tokens.length;
  const uniqueWords = new Set(tokens).size;
  const duplicateRatio = totalWords === 0 ? 0 : Number(((totalWords - uniqueWords) / totalWords).toFixed(4));
  const sentences = content
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const sentenceCount = sentences.length;
  const phraseCounts = buildNgrams(tokens, phraseSize);
  const repeatedPhrases = Array.from(phraseCounts.entries())
    .filter(([, count]) => count > 1)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, maxMatches)
    .map(([phrase, count]) => ({ phrase, count }));

  const repeatedPhraseInstances = Array.from(phraseCounts.values()).filter((count) => count > 1).reduce((sum, count) => sum + count, 0);
  const internalSimilarityScore = totalWords === 0
    ? 0
    : toPercentage(Math.min(1, (duplicateRatio * 0.55) + ((repeatedPhraseInstances / Math.max(totalWords, 1)) * 0.45)));

  return {
    input: content,
    totalWords,
    uniqueWords,
    duplicateRatio,
    sentenceCount,
    repeatedPhraseCount: repeatedPhrases.length,
    topRepeatedPhrases: repeatedPhrases,
    internalSimilarityScore
  };
}

function analyzePairwise(tokensByText: string[][], phraseSize: number, maxMatches: number): PairwiseMatch[] {
  const analyses: PairwiseMatch[] = [];

  for (let leftIndex = 0; leftIndex < tokensByText.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < tokensByText.length; rightIndex += 1) {
      const leftPhrases = buildNgrams(tokensByText[leftIndex], phraseSize);
      const rightPhrases = buildNgrams(tokensByText[rightIndex], phraseSize);

      const leftKeys = new Set(leftPhrases.keys());
      const rightKeys = new Set(rightPhrases.keys());
      const shared = Array.from(leftKeys).filter((phrase) => rightKeys.has(phrase));
      const union = new Set([...leftKeys, ...rightKeys]).size;
      const similarityScore = union === 0 ? 0 : toPercentage(shared.length / union);

      analyses.push({
        leftIndex,
        rightIndex,
        similarityScore,
        sharedPhraseCount: shared.length,
        sharedPhrases: shared
          .sort((left, right) => {
            const rightWeight = (leftPhrases.get(right) ?? 0) + (rightPhrases.get(right) ?? 0);
            const leftWeight = (leftPhrases.get(left) ?? 0) + (rightPhrases.get(left) ?? 0);
            return rightWeight - leftWeight || left.localeCompare(right);
          })
          .slice(0, maxMatches)
      });
    }
  }

  return analyses.sort((left, right) => right.similarityScore - left.similarityScore);
}

function classifyRisk(maxSimilarity: number, maxInternalSimilarity: number) {
  const score = Math.max(maxSimilarity, maxInternalSimilarity);
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export function analyzePlagiarismTexts(texts: string[], options: { phraseSize?: number; maxMatches?: number } = {}) {
  const phraseSize = Math.max(3, Math.min(options.phraseSize ?? 4, 8));
  const maxMatches = Math.max(1, Math.min(options.maxMatches ?? 5, 10));
  const analyses = texts.map((text) => analyzeSingleText(text, phraseSize, maxMatches));
  const tokenized = texts.map((text) => tokenize(text));
  const pairwise = analyzePairwise(tokenized, phraseSize, maxMatches);
  const maxPairwiseSimilarity = pairwise[0]?.similarityScore ?? 0;
  const maxInternalSimilarity = analyses.reduce((max, analysis) => Math.max(max, analysis.internalSimilarityScore), 0);
  const riskLevel = classifyRisk(maxPairwiseSimilarity, maxInternalSimilarity);

  return {
    status: 'analyzed' as const,
    method: 'local_ngram_similarity',
    textCount: texts.length,
    phraseSize,
    maxMatches,
    riskLevel,
    maxPairwiseSimilarity,
    maxInternalSimilarity,
    results: analyses,
    pairwiseMatches: pairwise,
    evidence: {
      localTokenizationUsed: true,
      pairwiseComparisonCount: pairwise.length,
      repeatedPhraseEvidence: analyses.some((analysis) => analysis.repeatedPhraseCount > 0),
      crossTextOverlapDetected: pairwise.some((match) => match.sharedPhraseCount > 0)
    }
  };
}
