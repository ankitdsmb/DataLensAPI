import { load } from 'cheerio';
import { stealthGet } from '../httpClient';

type PropertyReferenceType = 'measurement_id' | 'ga4_property_id' | 'unknown';

export type Ga4McpRequest = {
  url: string;
  timeoutMs: number;
  propertyId?: string;
};

export type Ga4McpResult =
  | {
      url: string;
      status: 'analyzed';
      finalUrl: string;
      statusCode: number | null;
      contentType: string | null;
      title: string | null;
      measurementIds: string[];
      gtmContainerIds: string[];
      legacyUaIds: string[];
      ga4Detected: boolean;
      requestedProperty: {
        raw: string;
        normalized: string;
        type: PropertyReferenceType;
        matchesDetectedMeasurementId: boolean | null;
        note: string | null;
      } | null;
      signals: {
        scriptCount: number;
        inlineScriptCount: number;
        gtagLoaderDetected: boolean;
        gtmLoaderDetected: boolean;
        dataLayerDetected: boolean;
        ga4ConfigDetected: boolean;
        measurementIdCount: number;
      };
      evidence: {
        htmlFetched: true;
        scriptsInspected: true;
        inlineConfigParsed: true;
        headersInspected: true;
      };
    }
  | {
      url: string;
      status: 'fetch_failed';
      finalUrl: null;
      statusCode: null;
      contentType: null;
      title: null;
      error: string;
      measurementIds: [];
      gtmContainerIds: [];
      legacyUaIds: [];
      ga4Detected: false;
      requestedProperty: {
        raw: string;
        normalized: string;
        type: PropertyReferenceType;
        matchesDetectedMeasurementId: null;
        note: string | null;
      } | null;
      signals: {
        scriptCount: 0;
        inlineScriptCount: 0;
        gtagLoaderDetected: false;
        gtmLoaderDetected: false;
        dataLayerDetected: false;
        ga4ConfigDetected: false;
        measurementIdCount: 0;
      };
      evidence: {
        htmlFetched: false;
        scriptsInspected: false;
        inlineConfigParsed: false;
        headersInspected: false;
      };
    };

function normalizeHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function collectMatches(text: string, pattern: RegExp) {
  const matches = new Set<string>();

  for (const match of text.matchAll(pattern)) {
    const value = match[0]?.trim();
    if (value) {
      matches.add(value.toUpperCase());
    }
  }

  return [...matches].sort();
}

function normalizePropertyReference(propertyId?: string) {
  if (typeof propertyId !== 'string' || propertyId.trim().length === 0) {
    return null;
  }

  const raw = propertyId.trim();
  const normalized = raw.toUpperCase();

  if (/^G-[A-Z0-9]{4,}$/.test(normalized)) {
    return {
      raw,
      normalized,
      type: 'measurement_id' as const,
      note: 'Compared directly against GA4 measurement ids detected in public page markup.'
    };
  }

  if (/^\d{4,}$/.test(normalized)) {
    return {
      raw,
      normalized,
      type: 'ga4_property_id' as const,
      note: 'Numeric GA4 property ids cannot be mapped to page tags without authenticated Google Analytics access.'
    };
  }

  return {
    raw,
    normalized,
    type: 'unknown' as const,
    note: 'Reference format was preserved, but it could not be mapped directly to a GA4 measurement id.'
  };
}

export async function inspectGa4McpTagEvidence(request: Ga4McpRequest): Promise<Ga4McpResult> {
  const requestedProperty = normalizePropertyReference(request.propertyId);

  try {
    const response = await stealthGet(request.url, {
      timeoutMs: request.timeoutMs,
      throwHttpErrors: false
    });
    const finalUrl = response.redirectUrls?.length
      ? response.redirectUrls[response.redirectUrls.length - 1]
      : request.url;
    const html = response.body;
    const $ = load(html);

    const scriptSrcs = $('script[src]')
      .toArray()
      .map((element) => $(element).attr('src')?.trim())
      .filter((value): value is string => Boolean(value));
    const inlineScripts = $('script:not([src])')
      .toArray()
      .map((element) => $(element).html() ?? '')
      .filter((value) => value.trim().length > 0);
    const haystack = [html, ...scriptSrcs, ...inlineScripts].join('\n');

    const measurementIds = collectMatches(haystack, /\bG-[A-Z0-9]{4,}\b/g);
    const gtmContainerIds = collectMatches(haystack, /\bGTM-[A-Z0-9]{4,}\b/g);
    const legacyUaIds = collectMatches(haystack, /\bUA-\d{4,}-\d+\b/g);

    return {
      url: request.url,
      status: 'analyzed',
      finalUrl,
      statusCode: response.statusCode ?? null,
      contentType: normalizeHeaderValue(response.headers['content-type']),
      title: $('title').first().text().trim() || null,
      measurementIds,
      gtmContainerIds,
      legacyUaIds,
      ga4Detected: measurementIds.length > 0,
      requestedProperty: requestedProperty
        ? {
            ...requestedProperty,
            matchesDetectedMeasurementId:
              requestedProperty.type === 'measurement_id'
                ? measurementIds.includes(requestedProperty.normalized)
                : null
          }
        : null,
      signals: {
        scriptCount: scriptSrcs.length,
        inlineScriptCount: inlineScripts.length,
        gtagLoaderDetected:
          /googletagmanager\.com\/gtag\/js/i.test(haystack) ||
          /gtag\s*\(/i.test(haystack),
        gtmLoaderDetected:
          /googletagmanager\.com\/gtm\.js/i.test(haystack) ||
          /gtm\.start/i.test(haystack) ||
          gtmContainerIds.length > 0,
        dataLayerDetected: /\bdataLayer\b/i.test(haystack),
        ga4ConfigDetected: /gtag\s*\(\s*['"]config['"]\s*,\s*['"]G-[A-Z0-9]{4,}['"]\s*\)/i.test(haystack),
        measurementIdCount: measurementIds.length
      },
      evidence: {
        htmlFetched: true,
        scriptsInspected: true,
        inlineConfigParsed: true,
        headersInspected: true
      }
    };
  } catch (error) {
    return {
      url: request.url,
      status: 'fetch_failed',
      finalUrl: null,
      statusCode: null,
      contentType: null,
      title: null,
      error: error instanceof Error ? error.message : 'fetch_failed',
      measurementIds: [],
      gtmContainerIds: [],
      legacyUaIds: [],
      ga4Detected: false,
      requestedProperty: requestedProperty
        ? {
            ...requestedProperty,
            matchesDetectedMeasurementId: null
          }
        : null,
      signals: {
        scriptCount: 0,
        inlineScriptCount: 0,
        gtagLoaderDetected: false,
        gtmLoaderDetected: false,
        dataLayerDetected: false,
        ga4ConfigDetected: false,
        measurementIdCount: 0
      },
      evidence: {
        htmlFetched: false,
        scriptsInspected: false,
        inlineConfigParsed: false,
        headersInspected: false
      }
    };
  }
}
