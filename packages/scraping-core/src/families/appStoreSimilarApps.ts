import { fetchHtmlDocument, getMetaContent, toAbsoluteUrl } from '../html';

export type AppStoreSimilarAppsInput = {
  appId: string;
  country?: string;
  timeoutMs: number;
  limit: number;
};

export type SimilarAppResult = {
  appId: string | null;
  title: string;
  subtitle: string | null;
  appUrl: string;
  iconUrl: string | null;
};

export type AppStoreSimilarAppsResult = {
  appId: string;
  appUrl: string;
  country: string;
  status: 'analyzed';
  source: 'app_store_similar_items_html';
  app: {
    name: string | null;
    developer: string | null;
    category: string | null;
    ratingValue: number | null;
    ratingCount: number | null;
    description: string | null;
    iconUrl: string | null;
  };
  shelfTitle: string | null;
  similarAppCount: number;
  similarApps: SimilarAppResult[];
  evidence: {
    pageFetched: boolean;
    sourceMetadataParsed: boolean;
    similarShelfParsed: boolean;
  };
};

type SoftwareApplicationJsonLd = {
  name?: unknown;
  description?: unknown;
  applicationCategory?: unknown;
  aggregateRating?: {
    ratingValue?: unknown;
    ratingCount?: unknown;
  };
  author?: {
    name?: unknown;
  };
};

function normalizeCountry(value: string | undefined) {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) {
    return 'us';
  }

  const safe = trimmed.replace(/[^a-z]/g, '');
  return safe.length >= 2 ? safe.slice(0, 2) : 'us';
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseSourceMetadata(jsonLd: string | null) {
  if (!jsonLd) {
    return {
      name: null,
      developer: null,
      category: null,
      ratingValue: null,
      ratingCount: null,
      description: null
    };
  }

  try {
    const parsed = JSON.parse(jsonLd) as SoftwareApplicationJsonLd;
    return {
      name: readString(parsed.name),
      developer: readString(parsed.author?.name),
      category: readString(parsed.applicationCategory),
      ratingValue: readNumber(parsed.aggregateRating?.ratingValue),
      ratingCount: readNumber(parsed.aggregateRating?.ratingCount),
      description: readString(parsed.description)
    };
  } catch {
    return {
      name: null,
      developer: null,
      category: null,
      ratingValue: null,
      ratingCount: null,
      description: null
    };
  }
}

function extractAppIdFromUrl(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/\/id(\d+)/);
  return match ? match[1] : null;
}

export async function fetchAppStoreSimilarApps(
  input: AppStoreSimilarAppsInput
): Promise<AppStoreSimilarAppsResult> {
  const country = normalizeCountry(input.country);
  const appUrl = `https://apps.apple.com/${country}/app/id${encodeURIComponent(input.appId)}`;
  const { $, html } = await fetchHtmlDocument(appUrl, { timeoutMs: input.timeoutMs });

  const sourceJsonLd = $('script#software-application').first().html()?.trim() ?? null;
  const sourceMetadata = parseSourceMetadata(sourceJsonLd);
  const sourceIconUrl = getMetaContent($, 'meta[property="og:image"]');

  const similarApps: SimilarAppResult[] = [];

  $('#similarItems li a[href*="/app/"]').each((_, element) => {
    if (similarApps.length >= input.limit) {
      return false;
    }

    const anchor = $(element);
    const relativeUrl = anchor.attr('href')?.trim() ?? null;
    const absoluteUrl = toAbsoluteUrl(relativeUrl, appUrl);
    const title =
      anchor.find('h3').first().text().trim() ||
      anchor.attr('aria-label')?.replace(/^View\s+/i, '').trim() ||
      '';

    if (!absoluteUrl || !title) {
      return;
    }

    const subtitle = anchor.find('p').first().text().trim() || null;
    const iconUrl =
      anchor.find('source').first().attr('srcset')?.split(',')[0]?.trim().split(' ')[0] ??
      anchor.find('img').first().attr('src')?.trim() ??
      null;

    similarApps.push({
      appId: extractAppIdFromUrl(absoluteUrl),
      title,
      subtitle,
      appUrl: absoluteUrl,
      iconUrl
    });
  });

  const shelfTitle = $('#similarItems [data-test-id="shelf-title"]').first().text().trim() || null;

  return {
    appId: input.appId,
    appUrl,
    country,
    status: 'analyzed',
    source: 'app_store_similar_items_html',
    app: {
      name: sourceMetadata.name,
      developer: sourceMetadata.developer,
      category: sourceMetadata.category,
      ratingValue: sourceMetadata.ratingValue,
      ratingCount: sourceMetadata.ratingCount,
      description: sourceMetadata.description,
      iconUrl: sourceIconUrl
    },
    shelfTitle,
    similarAppCount: similarApps.length,
    similarApps,
    evidence: {
      pageFetched: html.length > 0,
      sourceMetadataParsed: Boolean(sourceMetadata.name || sourceMetadata.developer || sourceMetadata.category),
      similarShelfParsed: similarApps.length > 0
    }
  };
}
