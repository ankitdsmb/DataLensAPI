import type { CheerioAPI } from 'cheerio';
import {
  createToolPolicy,
  fetchHtmlDocument,
  getMetaContent,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const trustpilotPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

const DOMAIN_LIKE_PATTERN = /^(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})(?:\/.*)?$/i;
const TITLE_PATTERN = /^(.*?)\s+is rated\s+"([^"]+)"\s+with\s+([0-9.]+)\s*\/\s*([0-9.]+)\s+on Trustpilot$/i;
const AGGREGATE_RATING_PATTERN =
  /"aggregateRating"\s*:\s*\{[\s\S]*?"bestRating"\s*:\s*"([^"]+)"[\s\S]*?"worstRating"\s*:\s*"([^"]+)"[\s\S]*?"ratingValue"\s*:\s*"([^"]+)"[\s\S]*?"reviewCount"\s*:\s*"([^"]+)"/i;
const BUSINESS_UNIT_PATTERN = /businessUnitId=([a-f0-9]+)/i;

type AggregateRatingEvidence = {
  bestRating: number | null;
  worstRating: number | null;
  ratingValue: number | null;
  reviewCount: number | null;
};

function toNullableNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTrustpilotIdentifier(company: string) {
  const domainMatch = company.match(DOMAIN_LIKE_PATTERN);
  if (domainMatch?.[1]) {
    return domainMatch[1].toLowerCase();
  }

  const slug = company
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug.length > 0 && !slug.includes('.') ? slug : null;
}

function parseAggregateRating(html: string): AggregateRatingEvidence | null {
  const match = html.match(AGGREGATE_RATING_PATTERN);
  if (!match) {
    return null;
  }

  return {
    bestRating: toNullableNumber(match[1]),
    worstRating: toNullableNumber(match[2]),
    ratingValue: toNullableNumber(match[3]),
    reviewCount: toNullableNumber(match[4])
  };
}

function parseTitleEvidence(title: string | null) {
  if (!title) {
    return null;
  }

  const match = title.match(TITLE_PATTERN);
  if (!match) {
    return null;
  }

  return {
    companyName: match[1]?.trim() || null,
    ratingLabel: match[2]?.trim() || null,
    ratingValue: toNullableNumber(match[3] ?? null),
    bestRating: toNullableNumber(match[4] ?? null)
  };
}

function readCanonicalUrl($: CheerioAPI) {
  return $('link[rel="canonical"]').attr('href')?.trim() || null;
}

function readNextPageUrl($: CheerioAPI) {
  return $('link[rel="next"]').attr('href')?.trim() || null;
}

export const POST = withScrapingHandler({ policy: trustpilotPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, trustpilotPolicy);
  requireAllowedFields(body, ['company']);
  const company = typeof body.company === 'string' ? body.company.trim() : '';

  if (!company) {
    throw new RequestValidationError('company is required', { field: 'company' });
  }

  const searchUrl = `https://www.trustpilot.com/search?query=${encodeURIComponent(company)}`;
  const reviewIdentifier = normalizeTrustpilotIdentifier(company);

  if (!reviewIdentifier) {
    return {
      company,
      searchUrl,
      status: 'helper_fallback',
      source: 'trustpilot_search_url',
      evidence: {
        reviewPageFetched: false,
        aggregateRatingParsed: false,
        openGraphParsed: false
      },
      contract: {
        productLabel: 'Trustpilot Review Evidence (Lite)',
        forensicCategory: 'html-scraper',
        implementationDepth: 'partial',
        launchRecommendation: 'public_lite',
        notes:
          'Attempts direct Trustpilot review-page evidence extraction when the input resolves to a review identifier. Plain company names fall back to a search helper.'
      }
    };
  }

  const reviewUrl = `https://www.trustpilot.com/review/${encodeURIComponent(reviewIdentifier)}`;

  try {
    const { html, $ } = await fetchHtmlDocument(reviewUrl, { timeoutMs: trustpilotPolicy.timeoutMs });
    const aggregateRating = parseAggregateRating(html);
    const title = $('title').first().text().trim() || null;
    const metaDescription = getMetaContent($, 'meta[name="description"]');
    const ogTitle = getMetaContent($, 'meta[property="og:title"]');
    const ogDescription = getMetaContent($, 'meta[property="og:description"]');
    const ogImage = getMetaContent($, 'meta[property="og:image"]');
    const titleEvidence = parseTitleEvidence(title ?? ogTitle);
    const canonicalUrl = readCanonicalUrl($) ?? reviewUrl;
    const nextPageUrl = readNextPageUrl($);
    const businessUnitId = ogImage?.match(BUSINESS_UNIT_PATTERN)?.[1] ?? null;

    if (!aggregateRating && !ogTitle && !metaDescription) {
      throw new Error('trustpilot_review_page_unresolved');
    }

    return {
      company,
      searchUrl,
      reviewIdentifier,
      reviewUrl,
      canonicalUrl,
      nextPageUrl,
      source: 'trustpilot_review_html',
      status: 'analyzed',
      companyName: titleEvidence?.companyName ?? null,
      ratingLabel: titleEvidence?.ratingLabel ?? null,
      trustScore: aggregateRating?.ratingValue ?? titleEvidence?.ratingValue ?? null,
      bestRating: aggregateRating?.bestRating ?? titleEvidence?.bestRating ?? null,
      worstRating: aggregateRating?.worstRating ?? 1,
      reviewCount: aggregateRating?.reviewCount ?? null,
      title,
      metaTitle: ogTitle,
      description: metaDescription ?? ogDescription,
      shareImageUrl: ogImage ?? null,
      businessUnitId,
      evidence: {
        reviewPageFetched: true,
        aggregateRatingParsed: Boolean(aggregateRating),
        openGraphParsed: Boolean(ogTitle || ogDescription || ogImage)
      },
      contract: {
        productLabel: 'Trustpilot Review Evidence (Lite)',
        forensicCategory: 'html-scraper',
        implementationDepth: 'live',
        launchRecommendation: 'public_lite',
        notes:
          'Fetches the public Trustpilot review page and extracts aggregate rating and metadata evidence. If the input does not resolve directly to a review identifier, the route falls back to a search helper.'
      }
    };
  } catch {
    return {
      company,
      searchUrl,
      reviewIdentifier,
      reviewUrl,
      status: 'helper_fallback',
      source: 'trustpilot_search_url',
      evidence: {
        reviewPageFetched: false,
        aggregateRatingParsed: false,
        openGraphParsed: false
      },
      contract: {
        productLabel: 'Trustpilot Review Evidence (Lite)',
        forensicCategory: 'html-scraper',
        implementationDepth: 'partial',
        launchRecommendation: 'public_lite',
        notes:
          'Attempts direct Trustpilot review-page evidence extraction when possible. Falls back to a search helper if the review page is unavailable or cannot be parsed.'
      }
    };
  }
});
