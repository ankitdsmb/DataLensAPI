import { RequestValidationError } from '../validation';

type Platform = 'generic' | 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'x';
type Category = 'exact' | 'token' | 'acronym' | 'platform_modifier' | 'cross_keyword';

type Suggestion = {
  hashtag: string;
  score: number;
  keyword: string;
  category: Category;
  source: 'local_rules';
};

type PlatformProfile = {
  recommendedMin: number;
  recommendedMax: number;
  suffixes: string[];
};

const PLATFORM_PROFILES: Record<Platform, PlatformProfile> = {
  generic: { recommendedMin: 5, recommendedMax: 10, suffixes: ['tips', 'guide', 'ideas'] },
  instagram: { recommendedMin: 12, recommendedMax: 20, suffixes: ['daily', 'community', 'lovers'] },
  tiktok: { recommendedMin: 3, recommendedMax: 6, suffixes: ['tips', 'hacks', 'trends'] },
  youtube: { recommendedMin: 3, recommendedMax: 5, suffixes: ['guide', 'tutorial', 'channel'] },
  linkedin: { recommendedMin: 3, recommendedMax: 5, suffixes: ['insights', 'strategy', 'leadership'] },
  x: { recommendedMin: 1, recommendedMax: 3, suffixes: ['news', 'trends', 'update'] }
};

export type SocialHashtagOptions = {
  platform?: string;
  maxTags?: number;
  includeBroad?: boolean;
  combineKeywords?: boolean;
};

function assertPlatform(value: string | undefined): Platform {
  if (!value) return 'generic';

  const normalized = value.trim().toLowerCase();
  if (normalized === 'generic' || normalized === 'instagram' || normalized === 'tiktok' || normalized === 'youtube' || normalized === 'linkedin' || normalized === 'x') {
    return normalized;
  }

  throw new RequestValidationError('platform must be one of generic, instagram, tiktok, youtube, linkedin, or x', {
    field: 'platform'
  });
}

function normalizeKeywords(keywords: string[]) {
  const normalized = keywords
    .map((keyword) =>
      keyword
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean);

  if (normalized.length === 0) {
    throw new RequestValidationError('keywords must contain at least one usable keyword', {
      field: 'keywords'
    });
  }

  return Array.from(new Set(normalized));
}

function toHashtag(slug: string) {
  return `#${slug}`;
}

function pushSuggestion(
  suggestions: Suggestion[],
  seen: Set<string>,
  keyword: string,
  slug: string,
  category: Category,
  score: number
) {
  if (slug.length < 2) return;

  const hashtag = toHashtag(slug);
  const dedupeKey = hashtag.toLowerCase();
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);

  suggestions.push({
    hashtag,
    score,
    keyword,
    category,
    source: 'local_rules'
  });
}

function buildKeywordSuggestions(keyword: string, profile: PlatformProfile, includeBroad: boolean) {
  const tokens = keyword.split(' ').filter(Boolean);
  const suggestions: Suggestion[] = [];
  const seen = new Set<string>();

  const exactSlug = tokens.join('');
  pushSuggestion(suggestions, seen, keyword, exactSlug, 'exact', 100);

  tokens.forEach((token, index) => {
    pushSuggestion(suggestions, seen, keyword, token, 'token', 90 - index);
  });

  if (tokens.length >= 2 && tokens.length <= 5) {
    const acronym = tokens.map((token) => token[0]).join('');
    pushSuggestion(suggestions, seen, keyword, acronym, 'acronym', 88);
  }

  if (includeBroad) {
    for (const suffix of profile.suffixes) {
      pushSuggestion(suggestions, seen, keyword, `${exactSlug}${suffix}`, 'platform_modifier', 72);
    }
  }

  return {
    keyword,
    tokens,
    suggestions: suggestions.sort((left, right) => right.score - left.score)
  };
}

export function generateSocialHashtags(keywords: string[], options: SocialHashtagOptions = {}) {
  const platform = assertPlatform(options.platform);
  const profile = PLATFORM_PROFILES[platform];
  const normalizedKeywords = normalizeKeywords(keywords);
  const maxTags = Math.max(1, Math.min(options.maxTags ?? profile.recommendedMax, 50));
  const includeBroad = options.includeBroad !== false;
  const combineKeywords = options.combineKeywords !== false;

  const grouped = normalizedKeywords.map((keyword) => buildKeywordSuggestions(keyword, profile, includeBroad));

  const allSuggestions = grouped.flatMap((group) => group.suggestions);
  const globalSeen = new Set(allSuggestions.map((suggestion) => suggestion.hashtag.toLowerCase()));

  if (combineKeywords && normalizedKeywords.length > 1) {
    const primaryTokens = normalizedKeywords.map((keyword) => keyword.split(' ')[0]).filter(Boolean);
    const combinedSlug = primaryTokens.join('');
    if (combinedSlug.length >= 3 && !globalSeen.has(`#${combinedSlug}`)) {
      allSuggestions.push({
        hashtag: `#${combinedSlug}`,
        score: 67,
        keyword: normalizedKeywords.join(' + '),
        category: 'cross_keyword',
        source: 'local_rules'
      });
      globalSeen.add(`#${combinedSlug}`);
    }
  }

  const duplicateCount = allSuggestions.length - globalSeen.size;

  const ranked = Array.from(
    allSuggestions
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return left.hashtag.localeCompare(right.hashtag);
      })
      .reduce((unique, suggestion) => {
        const dedupeKey = suggestion.hashtag.toLowerCase();
        if (!unique.has(dedupeKey)) {
          unique.set(dedupeKey, suggestion);
        }
        return unique;
      }, new Map<string, Suggestion>())
      .values()
  ).slice(0, maxTags);

  const exactCount = ranked.filter((item) => item.category === 'exact').length;
  const tokenCount = ranked.filter((item) => item.category === 'token').length;
  const broadCount = ranked.filter((item) => item.category === 'platform_modifier').length;
  const crossKeywordCount = ranked.filter((item) => item.category === 'cross_keyword').length;

  return {
    status: 'generated' as const,
    platform,
    keywordCount: normalizedKeywords.length,
    hashtagCount: ranked.length,
    recommendedRange: {
      min: profile.recommendedMin,
      max: profile.recommendedMax
    },
    hashtags: ranked,
    grouped: grouped.map((group) => ({
      keyword: group.keyword,
      tokens: group.tokens,
      suggestions: group.suggestions.slice(0, Math.min(6, group.suggestions.length))
    })),
    evidence: {
      normalizedKeywordCount: normalizedKeywords.length,
      exactCount,
      tokenCount,
      broadCount,
      crossKeywordCount,
      duplicatesRemoved: duplicateCount,
      platformPresetUsed: platform
    }
  };
}
