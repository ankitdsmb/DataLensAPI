import type { CheerioAPI } from 'cheerio';
import {
  createToolPolicy,
  fetchHtmlDocument,
  getMetaContent,
  readJsonBody,
  RequestValidationError,
  requireAllowedFields,
  toAbsoluteUrl,
  withScrapingHandler
} from '@forensic/scraping-core';

const BBB_BASE_URL = 'https://www.bbb.org';

const bbbPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

type JsonObject = Record<string, unknown>;

type SearchResult = {
  name: string | null;
  profileUrl: string | null;
  category: string | null;
  bbbRating: string | null;
  serviceAreas: string[];
};

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim() || null;
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function extractBalancedJsonObject(source: string, marker: string) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  const jsonStart = source.indexOf('{', markerIndex + marker.length);
  if (jsonStart < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let index = jsonStart; index < source.length; index += 1) {
    const char = source[index];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(jsonStart, index + 1);
      }
    }
  }

  return null;
}

function parseWebDigitalData(html: string): JsonObject | null {
  const json = extractBalancedJsonObject(html, 'var webDigitalData=');
  if (!json) {
    return null;
  }

  try {
    return JSON.parse(json) as JsonObject;
  } catch {
    return null;
  }
}

function parseLocalBusinessSchema($: CheerioAPI): JsonObject | null {
  const scripts = $('script[type="application/ld+json"]').toArray();

  for (const script of scripts) {
    const raw = $(script).html();
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      const candidates = Array.isArray(parsed) ? parsed : [parsed];

      for (const candidate of candidates) {
        if (
          typeof candidate === 'object' &&
          candidate !== null &&
          (candidate as JsonObject)['@type'] === 'LocalBusiness'
        ) {
          return candidate as JsonObject;
        }
      }
    } catch {
      // Ignore malformed schema blocks.
    }
  }

  return null;
}

function parseSearchResults($: CheerioAPI): SearchResult[] {
  return $('.result-card')
    .toArray()
    .map((card) => {
      const cardNode = $(card);
      const profileHref = cardNode.find('.result-business-name a').first().attr('href');

      return {
        name: normalizeText(cardNode.find('.result-business-name').first().text()),
        profileUrl: toAbsoluteUrl(profileHref ?? null, BBB_BASE_URL),
        category: normalizeText(cardNode.find('p').first().text()),
        bbbRating: normalizeText(cardNode.find('.result-rating').first().text()?.replace(/^BBB Rating:\s*/i, '')),
        serviceAreas: cardNode
          .find('.service-area-list li')
          .toArray()
          .map((item) => normalizeText($(item).text()))
          .filter((item): item is string => Boolean(item))
      };
    })
    .filter((item) => item.name || item.profileUrl);
}

function collectComplaintSignals(html: string) {
  return [...html.matchAll(/(\d+)\s+complaint\(s\)\s+filed against business/gi)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));
}

export const POST = withScrapingHandler({ policy: bbbPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, bbbPolicy);
  requireAllowedFields(body, ['company']);
  const company = typeof body.company === 'string' ? body.company.trim() : '';

  if (!company) {
    throw new RequestValidationError('company is required', { field: 'company' });
  }

  const searchUrl = `${BBB_BASE_URL}/search?find_text=${encodeURIComponent(company)}`;
  const { $: search$ } = await fetchHtmlDocument(searchUrl, { timeoutMs: bbbPolicy.timeoutMs });
  const results = parseSearchResults(search$).slice(0, 5);
  const bestMatch = results[0] ?? null;

  if (!bestMatch?.profileUrl) {
    return {
      company,
      searchUrl,
      status: 'search_results_only',
      totalResults: results.length,
      results,
      evidence: {
        searchPageFetched: true,
        searchResultsParsed: results.length > 0,
        profilePageFetched: false,
        structuredDataParsed: false,
        webDigitalDataParsed: false
      },
      contract: {
        productLabel: 'BBB Company Evidence (Lite)',
        forensicCategory: 'html-scraper',
        implementationDepth: 'partial',
        launchRecommendation: 'public_lite',
        notes:
          'Fetches the public BBB search page and parses visible business-result cards. If no direct profile match is found, the route returns search evidence only.'
      }
    };
  }

  const { html: profileHtml, $: profile$ } = await fetchHtmlDocument(bestMatch.profileUrl, { timeoutMs: bbbPolicy.timeoutMs });
  const webDigitalData = parseWebDigitalData(profileHtml);
  const localBusiness = parseLocalBusinessSchema(profile$);
  const businessInfo =
    typeof webDigitalData?.business_info === 'object' && webDigitalData.business_info !== null
      ? (webDigitalData.business_info as JsonObject)
      : null;
  const complaintSignals = collectComplaintSignals(profileHtml);
  const ratingReasons = profile$('#rating li')
    .toArray()
    .map((item) => normalizeText(profile$(item).text()))
    .filter((item): item is string => Boolean(item));

  const address =
    typeof localBusiness?.address === 'object' && localBusiness.address !== null
      ? (localBusiness.address as JsonObject)
      : null;
  const geo =
    typeof localBusiness?.geo === 'object' && localBusiness.geo !== null ? (localBusiness.geo as JsonObject) : null;

  return {
    company,
    searchUrl,
    status: 'analyzed',
    totalResults: results.length,
    results,
    bestMatch,
    profile: {
      title: normalizeText(profile$('title').text()),
      profileUrl: bestMatch.profileUrl,
      canonicalUrl: profile$('link[rel="canonical"]').attr('href')?.trim() ?? bestMatch.profileUrl,
      description: getMetaContent(profile$, 'meta[name="description"]'),
      ogTitle: getMetaContent(profile$, 'meta[property="og:title"]'),
      ogDescription: getMetaContent(profile$, 'meta[property="og:description"]'),
      accreditedStatus: readString(businessInfo?.accredited_status),
      businessName: readString(localBusiness?.name) ?? readString(businessInfo?.business_name) ?? bestMatch.name,
      legalName: readString(localBusiness?.legalName),
      bbbRating:
        normalizeText(profile$('.bpr-letter-grade').first().text()) ??
        readString(businessInfo?.business_rating) ??
        bestMatch.bbbRating,
      ratingReasons,
      complaintSignals,
      complaintsFiledCount: complaintSignals.length > 0 ? Math.max(...complaintSignals) : null,
      phone: readString(localBusiness?.telephone) ?? readString(businessInfo?.business_phone),
      foundingDate: readString(localBusiness?.foundingDate),
      employeeCount:
        typeof localBusiness?.numberOfEmployees === 'object' && localBusiness.numberOfEmployees !== null
          ? readNumber((localBusiness.numberOfEmployees as JsonObject).value)
          : null,
      address: address
        ? {
            streetAddress: readString(address.streetAddress),
            locality: readString(address.addressLocality),
            region: readString(address.addressRegion),
            postalCode: readString(address.postalCode),
            country: readString(address.addressCountry)
          }
        : null,
      coordinates: geo
        ? {
            latitude: readString(geo.latitude),
            longitude: readString(geo.longitude)
          }
        : null
    },
    evidence: {
      searchPageFetched: true,
      searchResultsParsed: results.length > 0,
      profilePageFetched: true,
      structuredDataParsed: Boolean(localBusiness),
      webDigitalDataParsed: Boolean(webDigitalData)
    },
    contract: {
      productLabel: 'BBB Company Evidence (Lite)',
      forensicCategory: 'html-scraper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Fetches the public BBB search page, parses visible business matches, then enriches the best match with BBB profile metadata, rating evidence, and complaint signals from the public business profile.'
    }
  };
});
