import type { CheerioAPI } from 'cheerio';
import { getAttribute, getElementText, getMetaContent, toAbsoluteUrl } from './html';

export type AuditSeverity = 'high' | 'medium' | 'low';

export type AuditIssue = {
  code: string;
  severity: AuditSeverity;
  category: 'technical' | 'content' | 'links' | 'images';
  message: string;
};

export type ExtractedLink = {
  href: string;
  text: string;
  is_internal: boolean;
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

export function extractLinks($: CheerioAPI, pageUrl: string, internalOnly = false): ExtractedLink[] {
  const baseUrl = new URL(pageUrl);
  const links: ExtractedLink[] = [];

  $('a').each((_, element) => {
    const href = $(element).attr('href');
    const text = $(element).text().trim();

    if (!href || href.length === 0 || href.startsWith('javascript:')) {
      return;
    }

    try {
      const fullUrl = new URL(href, pageUrl);

      if (internalOnly && fullUrl.origin !== baseUrl.origin) {
        return;
      }

      links.push({
        href: fullUrl.href,
        text,
        is_internal: fullUrl.origin === baseUrl.origin
      });
    } catch {
      // Ignore invalid URLs discovered in href attributes.
    }
  });

  return links;
}

export function analyzeMetaTagsSection($: CheerioAPI, pageUrl: string) {
  const page = {
    title: getElementText($, 'title'),
    metaDescription: getMetaContent($, 'meta[name="description"]'),
    canonicalUrl: toAbsoluteUrl(getAttribute($, 'link[rel="canonical"]', 'href'), pageUrl),
    robots: getMetaContent($, 'meta[name="robots"]'),
    ogTitle: getMetaContent($, 'meta[property="og:title"]'),
    ogDescription: getMetaContent($, 'meta[property="og:description"]'),
    ogImage: toAbsoluteUrl(getMetaContent($, 'meta[property="og:image"]'), pageUrl),
    twitterCard: getMetaContent($, 'meta[name="twitter:card"]'),
    twitterTitle: getMetaContent($, 'meta[name="twitter:title"]'),
    twitterDescription: getMetaContent($, 'meta[name="twitter:description"]'),
    twitterImage: toAbsoluteUrl(getMetaContent($, 'meta[name="twitter:image"]'), pageUrl)
  };

  const issues: AuditIssue[] = [];

  if (!page.title) {
    issues.push({ code: 'missing_title', severity: 'high', category: 'technical', message: 'Page title is missing.' });
  } else if (page.title.length > 60) {
    issues.push({
      code: 'title_too_long',
      severity: 'medium',
      category: 'content',
      message: 'Page title is longer than 60 characters.'
    });
  }

  if (!page.metaDescription) {
    issues.push({
      code: 'missing_meta_description',
      severity: 'high',
      category: 'technical',
      message: 'Meta description is missing.'
    });
  } else if (page.metaDescription.length > 160) {
    issues.push({
      code: 'description_too_long',
      severity: 'medium',
      category: 'content',
      message: 'Meta description is longer than 160 characters.'
    });
  }

  if (!page.canonicalUrl) {
    issues.push({ code: 'missing_canonical', severity: 'medium', category: 'technical', message: 'Canonical URL is missing.' });
  }

  if (!page.ogTitle) {
    issues.push({ code: 'missing_og_title', severity: 'medium', category: 'content', message: 'Open Graph title is missing.' });
  }

  if (!page.ogDescription) {
    issues.push({
      code: 'missing_og_description',
      severity: 'medium',
      category: 'content',
      message: 'Open Graph description is missing.'
    });
  }

  if (!page.ogImage) {
    issues.push({ code: 'missing_og_image', severity: 'medium', category: 'images', message: 'Open Graph image is missing.' });
  }

  if (!page.twitterCard) {
    issues.push({
      code: 'missing_twitter_card',
      severity: 'low',
      category: 'content',
      message: 'Twitter card metadata is missing.'
    });
  }

  if (page.robots?.toLowerCase().includes('noindex')) {
    issues.push({
      code: 'robots_noindex',
      severity: 'high',
      category: 'technical',
      message: 'Robots meta tag contains noindex.'
    });
  }

  return {
    titleLength: page.title?.length ?? 0,
    descriptionLength: page.metaDescription?.length ?? 0,
    ...page,
    issues
  };
}

export function analyzeHeadingsSection($: CheerioAPI) {
  const headings = $('h1, h2, h3, h4, h5, h6')
    .toArray()
    .map((element, index) => {
      const tagName = element.tagName.toLowerCase();
      const level = Number(tagName.replace('h', ''));
      const text = $(element).text().replace(/\s+/g, ' ').trim();

      return {
        index,
        level,
        tag: tagName,
        text
      };
    });

  const issues: AuditIssue[] = [];
  const counts = {
    h1: headings.filter((heading) => heading.level === 1).length,
    h2: headings.filter((heading) => heading.level === 2).length,
    h3: headings.filter((heading) => heading.level === 3).length,
    h4: headings.filter((heading) => heading.level === 4).length,
    h5: headings.filter((heading) => heading.level === 5).length,
    h6: headings.filter((heading) => heading.level === 6).length
  };

  if (counts.h1 === 0) {
    issues.push({ code: 'missing_h1', severity: 'high', category: 'content', message: 'Page is missing an H1 heading.' });
  }

  if (counts.h1 > 1) {
    issues.push({ code: 'multiple_h1', severity: 'medium', category: 'content', message: 'Page contains multiple H1 headings.' });
  }

  if (headings.length === 0) {
    issues.push({ code: 'no_headings', severity: 'high', category: 'content', message: 'Page contains no heading tags.' });
  }

  headings.forEach((heading) => {
    if (!heading.text) {
      issues.push({
        code: 'empty_heading_text',
        severity: 'medium',
        category: 'content',
        message: `Heading ${heading.tag.toUpperCase()} is empty.`
      });
    }
  });

  for (let index = 1; index < headings.length; index += 1) {
    const previousLevel = headings[index - 1].level;
    const currentLevel = headings[index].level;

    if (currentLevel > previousLevel + 1) {
      issues.push({
        code: 'heading_level_jump',
        severity: 'medium',
        category: 'content',
        message: `Heading structure jumps from H${previousLevel} to H${currentLevel}.`
      });
    }
  }

  return {
    counts,
    headings,
    issues
  };
}

function inferImageFormat(src: string | null) {
  if (!src) {
    return 'unknown';
  }

  if (src.startsWith('data:')) {
    return 'data-url';
  }

  try {
    const pathname = new URL(src, 'https://example.com').pathname.toLowerCase();
    return pathname.split('.').pop() || 'unknown';
  } catch {
    return 'unknown';
  }
}

function isModernImageFormat(format: string) {
  return ['webp', 'avif', 'svg'].includes(format);
}

export function analyzeImageSeoSection($: CheerioAPI, pageUrl: string) {
  const images = $('img')
    .toArray()
    .map((element, index) => {
      const src = $(element).attr('src')?.trim()
        || $(element).attr('data-src')?.trim()
        || null;
      const absoluteSrc = toAbsoluteUrl(src, pageUrl);
      const alt = $(element).attr('alt')?.trim() ?? null;
      const loading = $(element).attr('loading')?.trim() ?? null;
      const width = $(element).attr('width')?.trim() ?? null;
      const height = $(element).attr('height')?.trim() ?? null;
      const format = inferImageFormat(absoluteSrc);
      const issues: AuditIssue[] = [];

      if (alt === null) {
        issues.push({ code: 'missing_alt', severity: 'high', category: 'images', message: 'Image is missing alt text.' });
      } else if (alt.length === 0) {
        issues.push({ code: 'empty_alt', severity: 'medium', category: 'images', message: 'Image alt text is empty.' });
      }

      if (!width || !height) {
        issues.push({
          code: 'missing_dimensions',
          severity: 'medium',
          category: 'images',
          message: 'Image is missing width or height attributes.'
        });
      }

      if (!isModernImageFormat(format) && !['unknown', 'data-url'].includes(format)) {
        issues.push({
          code: 'non_modern_format',
          severity: 'low',
          category: 'images',
          message: `Image format ${format} is not a modern optimized format.`
        });
      }

      if (loading !== 'lazy') {
        issues.push({
          code: 'missing_lazy_loading',
          severity: 'low',
          category: 'images',
          message: 'Image is not using loading=\"lazy\".'
        });
      }

      return {
        index,
        src: absoluteSrc,
        alt,
        loading,
        width,
        height,
        format,
        issues
      };
    });

  return {
    imageCount: images.length,
    missingAltCount: images.filter((image) => image.issues.some((issue) => issue.code === 'missing_alt')).length,
    missingDimensionCount: images.filter((image) => image.issues.some((issue) => issue.code === 'missing_dimensions')).length,
    nonModernFormatCount: images.filter((image) => image.issues.some((issue) => issue.code === 'non_modern_format')).length,
    images,
    issues: images.flatMap((image) => image.issues)
  };
}

export function analyzeKeywordDensitySection(
  $: CheerioAPI,
  requestedKeywords: string[] = [],
  topN = 20
) {
  const title = getElementText($, 'title');
  const h1 = getElementText($, 'h1');

  $('script, style, noscript, nav, header, footer, iframe, img').remove();
  const rawText = $('body').text().replace(/\s+/g, ' ').trim();

  const words = rawText
    .replace(/[^a-zA-Z\s]/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2);

  const stopWords = new Set([
    'the', 'and', 'for', 'that', 'with', 'this', 'from', 'you', 'your', 'are', 'was',
    'but', 'not', 'all', 'can', 'our', 'out', 'has', 'have', 'will', 'into', 'about',
    'their', 'they', 'them', 'its', 'then', 'than', 'too', 'use'
  ]);

  const meaningfulWords = words.filter((word) => !stopWords.has(word));
  const totalWords = meaningfulWords.length;
  const wordCounts: Record<string, number> = {};

  meaningfulWords.forEach((word) => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });

  const topKeywords = Object.keys(wordCounts)
    .map((word) => ({
      keyword: word,
      count: wordCounts[word],
      density: totalWords === 0 ? 0 : Number(((wordCounts[word] / totalWords) * 100).toFixed(2))
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, topN);

  const keywordCoverage = requestedKeywords.map((keyword) => {
    const normalizedKeyword = keyword.toLowerCase();
    const escapedKeyword = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = rawText.toLowerCase().match(new RegExp(`\\b${escapedKeyword}\\b`, 'g')) ?? [];

    return {
      keyword,
      count: matches.length,
      density: totalWords === 0 ? 0 : Number(((matches.length / totalWords) * 100).toFixed(2)),
      inTitle: title ? title.toLowerCase().includes(normalizedKeyword) : false,
      inH1: h1 ? h1.toLowerCase().includes(normalizedKeyword) : false
    };
  });

  const issues: AuditIssue[] = [];

  keywordCoverage.forEach((keyword) => {
    if (keyword.count === 0) {
      issues.push({
        code: 'missing_target_keyword',
        severity: 'high',
        category: 'content',
        message: `Target keyword \"${keyword.keyword}\" is missing from page copy.`
      });
      return;
    }

    if (!keyword.inTitle) {
      issues.push({
        code: 'keyword_missing_in_title',
        severity: 'medium',
        category: 'content',
        message: `Target keyword \"${keyword.keyword}\" is missing from the title tag.`
      });
    }

    if (!keyword.inH1) {
      issues.push({
        code: 'keyword_missing_in_h1',
        severity: 'medium',
        category: 'content',
        message: `Target keyword \"${keyword.keyword}\" is missing from the H1.`
      });
    }
  });

  return {
    totalWords,
    topKeywords,
    keywordCoverage,
    stuffingRisk: keywordCoverage.some((item) => item.density >= 5)
      ? 'high'
      : keywordCoverage.some((item) => item.density >= 3)
        ? 'medium'
        : 'low',
    issues
  };
}

export function summarizeLinkSection(links: ExtractedLink[]) {
  const emptyAnchorCount = links.filter((link) => link.text.length === 0).length;
  const internalCount = links.filter((link) => link.is_internal).length;
  const externalCount = links.length - internalCount;
  const issues: AuditIssue[] = [];

  if (links.length === 0) {
    issues.push({
      code: 'no_links_found',
      severity: 'low',
      category: 'links',
      message: 'No links were discovered on the page.'
    });
  }

  if (emptyAnchorCount > 0) {
    issues.push({
      code: 'empty_anchor_text',
      severity: 'medium',
      category: 'links',
      message: `${emptyAnchorCount} links are missing visible anchor text.`
    });
  }

  return {
    totalLinks: links.length,
    internalCount,
    externalCount,
    emptyAnchorCount,
    sampleLinks: links.slice(0, 50),
    issues
  };
}

export function buildScoreFromIssues(issues: AuditIssue[]) {
  let score = 100;

  issues.forEach((issue) => {
    if (issue.severity === 'high') score -= 12;
    if (issue.severity === 'medium') score -= 6;
    if (issue.severity === 'low') score -= 3;
  });

  return clampScore(score);
}
