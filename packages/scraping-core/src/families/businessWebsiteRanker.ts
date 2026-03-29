import { load } from 'cheerio';
import { fetchHtmlDocument, getMetaContent } from '../html';
import {
  analyzeHeadingsSection,
  analyzeImageSeoSection,
  analyzeMetaTagsSection,
  buildScoreFromIssues,
  extractLinks,
  type AuditIssue
} from '../seoAudit';

const DIRECTORY_HOST_PATTERNS = [
  'bbb.org',
  'facebook.com',
  'foursquare.com',
  'healthgrades.com',
  'instagram.com',
  'linkedin.com',
  'mapquest.com',
  'nextdoor.com',
  'superpages.com',
  'tripadvisor.com',
  'wikipedia.org',
  'yelp.com',
  'yellowpages.com',
  'zocdoc.com'
];

const SOCIAL_HOST_PATTERNS = [
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'pinterest.com',
  'tiktok.com',
  'x.com',
  'youtube.com'
];

const PHONE_PATTERN = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const ADDRESS_PATTERN =
  /\b\d{1,6}\s+[A-Za-z0-9.'-]+\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|suite|ste)\b/i;
const CTA_PATTERN =
  /\b(?:book|schedule|appointment|call now|get started|request|quote|reserve|contact us|free consultation|visit us)\b/i;
const LOCAL_BUSINESS_SCHEMA_PATTERN =
  /"(?:@type|type)"\s*:\s*"(?:LocalBusiness|Dentist|MedicalBusiness|Store|Restaurant|ProfessionalService|AutoRepair|HomeAndConstructionBusiness)"/i;

const MAX_CANDIDATES = 3;

function keywordTokens(keyword: string) {
  return [...new Set(
    keyword
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 4)
  )];
}

function isArticleLikePath(pathname: string) {
  return /\/\d{4}\/\d{2}\//.test(pathname) || /\/(?:news|blog|article|stories|story|press|post)\b/i.test(pathname);
}

export type BusinessWebsiteRankerRequest = {
  keyword: string;
  location: string | null;
  timeoutMs: number;
};

export type BusinessSearchCandidate = {
  title: string;
  url: string;
  hostname: string;
  snippet: string | null;
  rank: number;
};

export type RankedBusinessWebsite = {
  businessName: string;
  websiteUrl: string;
  hostname: string;
  sourceTitle: string;
  sourceSnippet: string | null;
  sourceRank: number;
  qualityScore: number;
  scoreBand: 'strong' | 'fair' | 'weak';
  underperforming: boolean;
  issueCount: number;
  issueHighlights: AuditIssue[];
  signals: {
    https: boolean;
    titlePresent: boolean;
    metaDescriptionPresent: boolean;
    viewportPresent: boolean;
    phoneDetected: boolean;
    emailDetected: boolean;
    addressDetected: boolean;
    contactPageDetected: boolean;
    ctaDetected: boolean;
    localBusinessSchemaDetected: boolean;
    socialLinkCount: number;
    internalLinkCount: number;
  };
  evidence: {
    source: 'duckduckgo_html';
    searchResultRank: number;
    websiteFetched: boolean;
  };
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function scoreBand(score: number): 'strong' | 'fair' | 'weak' {
  if (score >= 80) {
    return 'strong';
  }

  if (score >= 60) {
    return 'fair';
  }

  return 'weak';
}

function decodeDuckDuckGoHref(rawHref: string | undefined): string | null {
  if (!rawHref) {
    return null;
  }

  try {
    const resolved = new URL(rawHref, 'https://duckduckgo.com');
    const encoded = resolved.searchParams.get('uddg');
    if (encoded) {
      return decodeURIComponent(encoded);
    }

    if (resolved.hostname.endsWith('duckduckgo.com')) {
      return null;
    }

    return resolved.toString();
  } catch {
    return null;
  }
}

function isDirectoryLikeHost(hostname: string) {
  return DIRECTORY_HOST_PATTERNS.some((pattern) => hostname === pattern || hostname.endsWith(`.${pattern}`));
}

function collectCtaSignal(text: string, links: { text: string; href: string }[]) {
  if (CTA_PATTERN.test(text)) {
    return true;
  }

  return links.some((link) => CTA_PATTERN.test(`${link.text} ${link.href}`));
}

function summarizeWebsite(candidate: BusinessSearchCandidate, html: string): RankedBusinessWebsite {
  const $ = load(html);
  const meta = analyzeMetaTagsSection($, candidate.url);
  const headings = analyzeHeadingsSection($);
  const images = analyzeImageSeoSection($, candidate.url);
  const links = extractLinks($, candidate.url, false);
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const internalLinks = links.filter((link) => link.is_internal);
  const socialLinkCount = links.filter((link) => {
    try {
      const hostname = new URL(link.href).hostname.toLowerCase();
      return SOCIAL_HOST_PATTERNS.some((pattern) => hostname === pattern || hostname.endsWith(`.${pattern}`));
    } catch {
      return false;
    }
  }).length;
  const viewportPresent = Boolean(getMetaContent($, 'meta[name="viewport"]'));
  const phoneDetected = PHONE_PATTERN.test(bodyText);
  const emailDetected = EMAIL_PATTERN.test(bodyText);
  const addressDetected = ADDRESS_PATTERN.test(bodyText);
  const contactPageDetected = internalLinks.some((link) => /contact|appointment|book|schedule|location|visit/i.test(`${link.text} ${link.href}`));
  const ctaDetected = collectCtaSignal(bodyText, links);
  const localBusinessSchemaDetected = $('script[type="application/ld+json"]').toArray().some((element) => {
    const text = $(element).text();
    return LOCAL_BUSINESS_SCHEMA_PATTERN.test(text);
  });

  const issues: AuditIssue[] = [...meta.issues, ...headings.issues, ...images.issues];

  if (!viewportPresent) {
    issues.push({
      code: 'missing_viewport',
      severity: 'medium',
      category: 'technical',
      message: 'No mobile viewport tag detected.'
    });
  }

  if (!phoneDetected) {
    issues.push({
      code: 'missing_phone_signal',
      severity: 'medium',
      category: 'content',
      message: 'No phone number signal detected on the page.'
    });
  }

  if (!contactPageDetected) {
    issues.push({
      code: 'missing_contact_page_signal',
      severity: 'medium',
      category: 'links',
      message: 'No obvious contact or booking path was detected.'
    });
  }

  if (!ctaDetected) {
    issues.push({
      code: 'missing_cta_signal',
      severity: 'low',
      category: 'content',
      message: 'No strong appointment/contact call-to-action was detected.'
    });
  }

  if (!localBusinessSchemaDetected) {
    issues.push({
      code: 'missing_local_business_schema',
      severity: 'low',
      category: 'technical',
      message: 'No obvious LocalBusiness-style structured data was detected.'
    });
  }

  if (socialLinkCount === 0) {
    issues.push({
      code: 'missing_social_links',
      severity: 'low',
      category: 'links',
      message: 'No obvious social profile links were detected.'
    });
  }

  let qualityScore = buildScoreFromIssues(issues);
  if (localBusinessSchemaDetected) {
    qualityScore += 4;
  }
  if (emailDetected) {
    qualityScore += 2;
  }
  if (addressDetected) {
    qualityScore += 2;
  }
  if (ctaDetected) {
    qualityScore += 2;
  }

  qualityScore = clampScore(qualityScore);

  return {
    businessName: candidate.title,
    websiteUrl: candidate.url,
    hostname: candidate.hostname,
    sourceTitle: candidate.title,
    sourceSnippet: candidate.snippet,
    sourceRank: candidate.rank,
    qualityScore,
    scoreBand: scoreBand(qualityScore),
    underperforming: qualityScore < 70,
    issueCount: issues.length,
    issueHighlights: issues.slice(0, 6),
    signals: {
      https: candidate.url.startsWith('https://'),
      titlePresent: Boolean(meta.title),
      metaDescriptionPresent: Boolean(meta.metaDescription),
      viewportPresent,
      phoneDetected,
      emailDetected,
      addressDetected,
      contactPageDetected,
      ctaDetected,
      localBusinessSchemaDetected,
      socialLinkCount,
      internalLinkCount: internalLinks.length
    },
    evidence: {
      source: 'duckduckgo_html' as const,
      searchResultRank: candidate.rank,
      websiteFetched: true
    }
  } satisfies RankedBusinessWebsite;
}

async function discoverCandidates(query: string, keyword: string, timeoutMs: number) {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const { $ } = await fetchHtmlDocument(searchUrl, { timeoutMs });
  const candidates: BusinessSearchCandidate[] = [];
  const seenHostnames = new Set<string>();
  const tokens = keywordTokens(keyword);

  $('.result').each((_, element) => {
    if (candidates.length >= MAX_CANDIDATES) {
      return false;
    }

    const container = $(element);
    const classes = container.attr('class') ?? '';
    if (classes.includes('result--ad')) {
      return;
    }

    const anchor = container.find('a.result__a').first();
    const rawHref = anchor.attr('href');
    const resolvedUrl = decodeDuckDuckGoHref(rawHref);
    if (!resolvedUrl) {
      return;
    }

    try {
      const parsedUrl = new URL(resolvedUrl);
      const hostname = parsedUrl.hostname.toLowerCase();
      const title = anchor.text().trim() || hostname;
      const snippet = container.find('.result__snippet').first().text().trim() || null;
      const relevanceText = `${title} ${hostname}`.toLowerCase();
      const matchesKeyword = tokens.length === 0 || tokens.some((token) => relevanceText.includes(token));
      const officialCue = /official site/i.test(title);

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return;
      }

      if (!matchesKeyword && !officialCue) {
        return;
      }

      if (isArticleLikePath(parsedUrl.pathname) && !tokens.some((token) => hostname.includes(token))) {
        return;
      }

      if (isDirectoryLikeHost(hostname) || seenHostnames.has(hostname)) {
        return;
      }

      seenHostnames.add(hostname);
      candidates.push({
        title,
        url: `${parsedUrl.origin}/`,
        hostname,
        snippet,
        rank: candidates.length + 1
      });
    } catch {
      // Ignore malformed or non-http result URLs.
    }
  });

  return {
    searchUrl,
    candidates
  };
}

export async function rankBusinessWebsites(request: BusinessWebsiteRankerRequest) {
  const query = [request.keyword, request.location].filter(Boolean).join(' ');
  const { searchUrl, candidates } = await discoverCandidates(query, request.keyword, request.timeoutMs);
  const analyses = await Promise.all(
    candidates.map(async (candidate) => {
      try {
        const { html } = await fetchHtmlDocument(candidate.url, { timeoutMs: request.timeoutMs });
        return summarizeWebsite(candidate, html);
      } catch {
        return null;
      }
    })
  );

  const rankedBusinesses = analyses
    .filter((value): value is RankedBusinessWebsite => value !== null)
    .sort((left, right) => left.qualityScore - right.qualityScore)
    .map((business, index) => ({
      ...business,
      rank: index + 1
    }));

  return {
    query,
    searchUrl,
    source: 'duckduckgo_html_search' as const,
    candidateCount: candidates.length,
    analyzedCount: rankedBusinesses.length,
    underperformingCount: rankedBusinesses.filter((business) => business.underperforming).length,
    rankedBusinesses
  };
}
