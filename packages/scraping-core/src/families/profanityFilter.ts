import { RequestValidationError } from '../validation';

type LexiconEntry = {
  term: string;
  category: 'profanity' | 'insult' | 'custom';
  severity: 'medium' | 'high';
};

const DEFAULT_LEXICON: LexiconEntry[] = [
  { term: 'asshole', category: 'insult', severity: 'high' },
  { term: 'bastard', category: 'insult', severity: 'medium' },
  { term: 'bitch', category: 'insult', severity: 'high' },
  { term: 'damn', category: 'profanity', severity: 'medium' },
  { term: 'fuck', category: 'profanity', severity: 'high' },
  { term: 'shit', category: 'profanity', severity: 'high' }
];

const LEET_NORMALIZATION: Record<string, string> = {
  '@': 'a',
  '$': 's',
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '!': 'i'
};

function normalizeCustomWords(customWords: string[] = []) {
  return customWords
    .map((word) => word.trim().toLowerCase())
    .filter((word) => /^[a-z]{3,32}$/.test(word))
    .map((term) => ({
      term,
      category: 'custom' as const,
      severity: 'medium' as const
    }));
}

function normalizeForMatching(text: string) {
  return text
    .toLowerCase()
    .split('')
    .map((character) => LEET_NORMALIZATION[character] ?? character)
    .join('');
}

function isBoundaryCharacter(character: string | undefined) {
  return !character || !/[a-z0-9]/i.test(character);
}

function collectMatches(text: string, lexicon: LexiconEntry[]) {
  const normalizedText = normalizeForMatching(text);
  const matches: Array<{
    term: string;
    matchedText: string;
    category: LexiconEntry['category'];
    severity: LexiconEntry['severity'];
    start: number;
    end: number;
    normalizedMatch: string;
  }> = [];

  for (const entry of lexicon) {
    let startIndex = 0;

    while (startIndex < normalizedText.length) {
      const foundIndex = normalizedText.indexOf(entry.term, startIndex);
      if (foundIndex === -1) break;

      const before = normalizedText[foundIndex - 1];
      const after = normalizedText[foundIndex + entry.term.length];
      if (isBoundaryCharacter(before) && isBoundaryCharacter(after)) {
        matches.push({
          term: entry.term,
          matchedText: text.slice(foundIndex, foundIndex + entry.term.length),
          category: entry.category,
          severity: entry.severity,
          start: foundIndex,
          end: foundIndex + entry.term.length,
          normalizedMatch: normalizedText.slice(foundIndex, foundIndex + entry.term.length)
        });
      }

      startIndex = foundIndex + 1;
    }
  }

  return matches.sort((left, right) => left.start - right.start || left.term.localeCompare(right.term));
}

function maskMatchRange(text: string, start: number, end: number) {
  return `${text.slice(0, start)}${'*'.repeat(Math.max(end - start, 1))}${text.slice(end)}`;
}

export function analyzeProfanityText(text: string, customWords: string[] = []) {
  const normalizedText = text.trim();
  if (!normalizedText) {
    throw new RequestValidationError('text is required', { field: 'text' });
  }

  const lexicon = [...DEFAULT_LEXICON, ...normalizeCustomWords(customWords)];
  const matches = collectMatches(normalizedText, lexicon);

  let cleaned = normalizedText;
  for (const match of [...matches].sort((left, right) => right.start - left.start)) {
    cleaned = maskMatchRange(cleaned, match.start, match.end);
  }

  const categoryCounts = matches.reduce<Record<string, number>>((accumulator, match) => {
    accumulator[match.category] = (accumulator[match.category] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    status: 'analyzed' as const,
    matchCount: matches.length,
    uniqueTerms: Array.from(new Set(matches.map((match) => match.term))),
    matches,
    cleaned,
    categoryCounts,
    highestSeverity: matches.some((match) => match.severity === 'high') ? 'high' : matches.length > 0 ? 'medium' : 'none',
    evidence: {
      localLexiconUsed: true,
      customTermsUsed: normalizeCustomWords(customWords).length,
      obfuscationNormalized: normalizeForMatching(normalizedText) !== normalizedText.toLowerCase()
    }
  };
}
