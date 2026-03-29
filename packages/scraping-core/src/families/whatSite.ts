import { load } from 'cheerio';
import { getAttribute, getMetaContent, toAbsoluteUrl } from '../html';
import { stealthGet } from '../httpClient';
import { analyzeHeadingsSection, analyzeMetaTagsSection, extractLinks } from '../seoAudit';

export type WhatSiteProfileRequest = {
  url: string;
  timeoutMs: number;
};

export type WhatSiteProfileResult =
  | {
      url: string;
      status: 'analyzed';
      finalUrl: string;
      statusCode: number | null;
      contentType: string | null;
      htmlBytes: number;
      title: string | null;
      description: string | null;
      canonicalUrl: string | null;
      robots: string | null;
      htmlLanguage: string | null;
      openGraph: {
        title: string | null;
        description: string | null;
        image: string | null;
      };
      twitter: {
        card: string | null;
        title: string | null;
        description: string | null;
      };
      headings: {
        h1Count: number;
        firstH1: string | null;
        totalHeadings: number;
      };
      links: {
        internalCount: number;
        externalCount: number;
      };
      content: {
        paragraphCount: number;
        wordCount: number;
      };
      issues: {
        total: number;
        meta: number;
        headings: number;
        codes: string[];
      };
      evidence: {
        htmlFetched: true;
        metaParsed: true;
        headingParsed: true;
        linkParsed: true;
      };
    }
  | {
      url: string;
      status: 'fetch_failed';
      finalUrl: null;
      statusCode: null;
      contentType: null;
      htmlBytes: 0;
      error: string;
      evidence: {
        htmlFetched: false;
        metaParsed: false;
        headingParsed: false;
        linkParsed: false;
      };
    };

function normalizeHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function countWords(text: string) {
  if (!text) {
    return 0;
  }

  return normalizeWhitespace(text)
    .split(/\s+/)
    .filter(Boolean).length;
}

export async function inspectWhatSiteProfile(request: WhatSiteProfileRequest): Promise<WhatSiteProfileResult> {
  try {
    const response = await stealthGet(request.url, {
      timeoutMs: request.timeoutMs,
      throwHttpErrors: false
    });
    const finalUrl = response.redirectUrls?.length
      ? response.redirectUrls[response.redirectUrls.length - 1]
      : request.url;
    const $ = load(response.body);
    const meta = analyzeMetaTagsSection($, finalUrl);
    const headings = analyzeHeadingsSection($);
    const links = extractLinks($, finalUrl, false);
    const bodyText = normalizeWhitespace($('body').text());
    const paragraphCount = $('p')
      .toArray()
      .map((element) => normalizeWhitespace($(element).text()))
      .filter(Boolean).length;
    const htmlLanguage = getAttribute($, 'html', 'lang');
    const internalCount = links.filter((link) => link.is_internal).length;
    const externalCount = links.length - internalCount;

    return {
      url: request.url,
      status: 'analyzed',
      finalUrl,
      statusCode: response.statusCode ?? null,
      contentType: normalizeHeaderValue(response.headers['content-type']),
      htmlBytes: Buffer.byteLength(response.body, 'utf8'),
      title: meta.title,
      description: meta.metaDescription,
      canonicalUrl: meta.canonicalUrl,
      robots: meta.robots,
      htmlLanguage,
      openGraph: {
        title: meta.ogTitle,
        description: meta.ogDescription,
        image: meta.ogImage
      },
      twitter: {
        card: meta.twitterCard,
        title: meta.twitterTitle,
        description: meta.twitterDescription
      },
      headings: {
        h1Count: headings.counts.h1,
        firstH1: headings.headings.find((heading) => heading.level === 1)?.text ?? null,
        totalHeadings: headings.headings.length
      },
      links: {
        internalCount,
        externalCount
      },
      content: {
        paragraphCount,
        wordCount: countWords(bodyText)
      },
      issues: {
        total: meta.issues.length + headings.issues.length,
        meta: meta.issues.length,
        headings: headings.issues.length,
        codes: [...meta.issues, ...headings.issues].slice(0, 8).map((issue) => issue.code)
      },
      evidence: {
        htmlFetched: true,
        metaParsed: true,
        headingParsed: true,
        linkParsed: true
      }
    };
  } catch (error) {
    return {
      url: request.url,
      status: 'fetch_failed',
      finalUrl: null,
      statusCode: null,
      contentType: null,
      htmlBytes: 0,
      error: error instanceof Error ? error.message : 'fetch_failed',
      evidence: {
        htmlFetched: false,
        metaParsed: false,
        headingParsed: false,
        linkParsed: false
      }
    };
  }
}

