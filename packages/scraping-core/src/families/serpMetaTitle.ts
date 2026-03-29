import { RequestValidationError } from '../validation';

type Intent = 'general' | 'guide' | 'comparison' | 'pricing' | 'checklist' | 'examples';

type SerpMetaTitleOptions = {
  brand?: string | null;
  audience?: string | null;
  location?: string | null;
  intent?: string | null;
  maxTitles?: number;
  includeYear?: boolean;
};

type Candidate = {
  template: string;
  intent: Intent;
};

function appendSegment(base: string, segment: string, targetLength: number, hardLimit: number) {
  if (!segment) return base;
  const next = `${base}${segment}`;

  if (next.length <= targetLength && next.length <= hardLimit) {
    return next;
  }

  return base;
}

function normalizeIntent(value: string | null | undefined): Intent {
  if (!value) return 'general';

  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'general' ||
    normalized === 'guide' ||
    normalized === 'comparison' ||
    normalized === 'pricing' ||
    normalized === 'checklist' ||
    normalized === 'examples'
  ) {
    return normalized;
  }

  throw new RequestValidationError('intent must be one of general, guide, comparison, pricing, checklist, or examples', {
    field: 'intent'
  });
}

function estimatePixelWidth(title: string) {
  return Array.from(title).reduce((total, character) => {
    if ('WMQG@#%&'.includes(character)) return total + 14;
    if ('ilI| '.includes(character)) return total + 5;
    if ('0123456789'.includes(character)) return total + 8;
    if (character === '-') return total + 7;
    return total + 9;
  }, 0);
}

function dedupeTitles(titles: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const title of titles) {
    const key = title.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(title);
    }
  }

  return unique;
}

function buildCandidates(keyword: string, intent: Intent, includeYear: boolean) {
  const currentYear = new Date().getUTCFullYear();
  const yearSuffix = includeYear ? ` ${currentYear}` : '';

  const core: Candidate[] = [
    { template: `${keyword} Guide${yearSuffix}`, intent: 'guide' },
    { template: `${keyword} Tips & Examples`, intent: 'examples' },
    { template: `Best ${keyword}${yearSuffix}`, intent: 'comparison' },
    { template: `${keyword} Checklist`, intent: 'checklist' },
    { template: `${keyword} Pricing Guide${yearSuffix}`, intent: 'pricing' },
    { template: `${keyword} Explained`, intent: 'general' }
  ];

  const intentBoosts: Record<Intent, Candidate[]> = {
    general: [
      { template: `${keyword}: What It Is and Why It Matters`, intent: 'general' }
    ],
    guide: [
      { template: `${keyword} Guide${yearSuffix}`, intent: 'guide' },
      { template: `How to Use ${keyword}${yearSuffix}`, intent: 'guide' }
    ],
    comparison: [
      { template: `${keyword}: Best Tools Compared${yearSuffix}`, intent: 'comparison' },
      { template: `${keyword} Comparison: Top Options`, intent: 'comparison' }
    ],
    pricing: [
      { template: `${keyword} Pricing Guide${yearSuffix}`, intent: 'pricing' },
      { template: `${keyword}: Cost, Plans & Value`, intent: 'pricing' }
    ],
    checklist: [
      { template: `${keyword} Checklist${yearSuffix}`, intent: 'checklist' },
      { template: `${keyword}: Step-by-Step Checklist`, intent: 'checklist' }
    ],
    examples: [
      { template: `${keyword} Examples That Convert`, intent: 'examples' },
      { template: `${keyword}: Best Examples${yearSuffix}`, intent: 'examples' }
    ]
  };

  return [...intentBoosts[intent], ...core];
}

function compactTitle(
  template: string,
  options: {
    audience: string;
    location: string;
    brand: string;
    targetLength: number;
    hardLimit: number;
  }
) {
  const { audience, location, brand, targetLength, hardLimit } = options;
  const reservedBrandLength = brand ? ` | ${brand}`.length : 0;
  const segmentTargetLength = Math.max(30, targetLength - reservedBrandLength);
  let title = template;

  if (location) {
    title = appendSegment(title, ` in ${location}`, segmentTargetLength, hardLimit);
  }

  if (audience) {
    title = appendSegment(title, ` for ${audience}`, segmentTargetLength, hardLimit);
  }

  if (brand) {
    const brandSuffix = ` | ${brand}`;
    const withBrand = `${title}${brandSuffix}`;
    if (withBrand.length <= hardLimit) {
      title = withBrand;
    } else {
      const maxBaseLength = Math.max(20, hardLimit - brandSuffix.length);
      title = `${title.slice(0, maxBaseLength).trim()}${brandSuffix}`;
    }
  }

  return title.slice(0, hardLimit).trim().replace(/\s+\|$/, '').trim();
}

function scoreTitle(title: string, keyword: string, brand: string, intent: Intent) {
  const normalizedTitle = title.toLowerCase();
  const normalizedKeyword = keyword.toLowerCase();
  const keywordIndex = normalizedTitle.indexOf(normalizedKeyword);
  const brandIncluded = brand ? normalizedTitle.includes(brand.toLowerCase()) : false;
  const length = title.length;
  const pixelWidthEstimate = estimatePixelWidth(title);
  const notes: string[] = [];
  let score = 0;

  if (keywordIndex === 0) {
    score += 40;
    notes.push('keyword-first');
  } else if (keywordIndex > 0) {
    score += 28;
    notes.push('keyword-included');
  }

  if (brandIncluded) {
    score += 10;
    notes.push('brand-included');
  }

  if (length >= 45 && length <= 60) {
    score += 25;
    notes.push('recommended-length');
  } else if (length >= 35 && length <= 68) {
    score += 15;
    notes.push('acceptable-length');
  } else {
    notes.push('length-risk');
  }

  if (pixelWidthEstimate <= 580) {
    score += 15;
    notes.push('pixel-safe');
  } else if (pixelWidthEstimate <= 640) {
    score += 8;
    notes.push('pixel-borderline');
  } else {
    notes.push('pixel-risk');
  }

  const keywordWords = keyword.split(/\s+/).filter(Boolean).length;
  if (keywordWords >= 2) {
    score += 5;
    notes.push('multi-word-keyword');
  }

  if (normalizedTitle.includes(intent === 'general' ? 'guide' : intent)) {
    score += 5;
    notes.push('intent-match');
  }

  return {
    title,
    score,
    length,
    pixelWidthEstimate,
    keywordPosition: keywordIndex,
    brandIncluded,
    notes
  };
}

export function generateSerpMetaTitles(keywordInput: string, options: SerpMetaTitleOptions = {}) {
  const keyword = keywordInput.trim();
  if (!keyword) {
    throw new RequestValidationError('keyword is required', { field: 'keyword' });
  }

  const brand = options.brand?.trim() || '';
  const audience = options.audience?.trim() || '';
  const location = options.location?.trim() || '';
  const intent = normalizeIntent(options.intent);
  const maxTitles = Math.max(3, Math.min(options.maxTitles ?? 6, 10));
  const includeYear = options.includeYear !== false;
  const targetLength = 60;
  const hardLimit = 68;

  const candidates = buildCandidates(keyword, intent, includeYear).map(({ template, intent: candidateIntent }) => {
    const title = compactTitle(template, {
      audience,
      location,
      brand,
      targetLength,
      hardLimit
    });

    return {
      ...scoreTitle(title, keyword, brand, candidateIntent),
      intent: candidateIntent
    };
  });

  const ranked = dedupeTitles(candidates.map((candidate) => candidate.title))
    .map((title) => candidates.find((candidate) => candidate.title === title)!)
    .sort((left, right) => right.score - left.score || left.length - right.length)
    .slice(0, maxTitles);

  const recommendedTitle = ranked[0]?.title ?? keyword;

  return {
    status: 'generated' as const,
    keyword,
    brand: brand || null,
    audience: audience || null,
    location: location || null,
    intent,
    recommendedTitle,
    titles: ranked,
    evidence: {
      keywordAtFrontCount: ranked.filter((title) => title.keywordPosition === 0).length,
      withinRecommendedLengthCount: ranked.filter((title) => title.length >= 45 && title.length <= 60).length,
      withinPixelWidthCount: ranked.filter((title) => title.pixelWidthEstimate <= 580).length,
      brandIncludedCount: ranked.filter((title) => title.brandIncluded).length,
      yearIncluded: includeYear
    }
  };
}
