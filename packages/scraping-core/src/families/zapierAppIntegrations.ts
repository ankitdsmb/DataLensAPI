import * as cheerio from 'cheerio';
import { getMetaContent, toAbsoluteUrl } from '../html';
import { stealthGet } from '../httpClient';

export type ZapierAppIntegrationsInput = {
  query: string;
  limit: number;
  timeoutMs: number;
};

export type ZapierIntegrationCard = {
  appName: string;
  appSlug: string | null;
  appUrl: string | null;
  detailsUrl: string;
  title: string;
  iconUrl: string | null;
  categories: string[];
};

export type ZapierAppIntegrationsResult = {
  query: string;
  requestedSlug: string;
  resolvedSlug: string;
  searchUrl: string;
  pageUrl: string;
  canonicalUrl: string;
  status: 'analyzed';
  source: 'zapier_app_integrations_html';
  app: {
    name: string;
    description: string | null;
    imageUrl: string | null;
    installUrl: string | null;
    featureList: string[];
    integrationCount: number | null;
  };
  integrationCardCount: number;
  integrations: ZapierIntegrationCard[];
  evidence: {
    pageFetched: boolean;
    metadataParsed: boolean;
    jsonLdParsed: boolean;
    integrationCardsParsed: boolean;
  };
};

type ZapierJsonLd = {
  description?: unknown;
  image?: unknown;
  installUrl?: unknown;
  featureList?: unknown;
  url?: unknown;
};

const QUERY_ALIASES: Record<string, string> = {
  openai: 'chatgpt',
  'chatgpt-openai': 'chatgpt'
};

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => readString(item)).filter((item): item is string => Boolean(item));
}

function humanizeSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function slugifyQuery(query: string) {
  const directUrlMatch = query.match(/zapier\.com\/apps\/([^/?#]+)/i);
  if (directUrlMatch?.[1]) {
    return directUrlMatch[1].trim().toLowerCase();
  }

  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return '';
  }

  const aliased = QUERY_ALIASES[trimmed] ?? trimmed;

  return aliased
    .replace(/&/g, ' and ')
    .replace(/\(([^)]+)\)/g, ' $1 ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildCandidateSlugs(query: string) {
  const candidates = new Set<string>();
  const base = slugifyQuery(query);

  if (base) {
    candidates.add(base);
  }

  if (base === 'openai') {
    candidates.add('chatgpt');
  }

  if (base.includes('chatgpt')) {
    candidates.add('chatgpt');
  }

  return [...candidates].filter(Boolean);
}

function parseAppNameFromTitle(title: string | null) {
  if (!title) {
    return null;
  }

  const match = title.match(/^(.*?)\s+Integrations\s+\|\s+Connect Your Apps with Zapier$/i);
  return match?.[1]?.trim() || null;
}

function parseIntegrationCount(description: string | null) {
  if (!description) {
    return null;
  }

  const match = description.match(/integrates with\s+([\d,]+)\s+other apps/i);
  if (!match?.[1]) {
    return null;
  }

  const parsed = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseZapierJsonLd(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as ZapierJsonLd;
  } catch {
    return null;
  }
}

function parseIntegrationLabel(label: string | null, appName: string | null, fallbackSlug: string | null) {
  if (label) {
    const normalized = label.replace(/^Integrate\s+/i, '').trim();
    if (appName) {
      const suffix = new RegExp(`\\s+with\\s+${appName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      const stripped = normalized.replace(suffix, '').trim();
      if (stripped) {
        return stripped;
      }
    }

    const genericMatch = normalized.match(/^(.*?)\s+with\s+.*$/i);
    if (genericMatch?.[1]?.trim()) {
      return genericMatch[1].trim();
    }
  }

  return fallbackSlug ? humanizeSlug(fallbackSlug) : 'Unknown App';
}

function extractIntegrationCards(
  $: cheerio.CheerioAPI,
  currentSlug: string,
  pageUrl: string,
  appName: string | null,
  limit: number
) {
  const results: ZapierIntegrationCard[] = [];
  const seen = new Set<string>();

  $('a[aria-label^="Integrate "][href*="/apps/"][href*="/integrations/"]').each((_, element) => {
    if (results.length >= limit) {
      return false;
    }

    const anchor = $(element);
    const detailsUrl = toAbsoluteUrl(anchor.attr('href')?.trim() ?? null, pageUrl);
    if (!detailsUrl || seen.has(detailsUrl)) {
      return;
    }

    const pathMatch = detailsUrl.match(/\/apps\/([^/]+)\/integrations\/([^/?#]+)/i);
    if (!pathMatch) {
      return;
    }

    const leftSlug = pathMatch[1]?.toLowerCase() ?? null;
    const rightSlug = pathMatch[2]?.toLowerCase() ?? null;
    const appSlug =
      leftSlug === currentSlug
        ? rightSlug
        : rightSlug === currentSlug
          ? leftSlug
          : leftSlug !== currentSlug
            ? leftSlug
            : rightSlug;

    const label = anchor.attr('aria-label')?.trim() ?? anchor.find('img').first().attr('alt')?.trim() ?? null;
    const appLabel = parseIntegrationLabel(label, appName, appSlug);
    const categories = anchor
      .closest('section')
      .find('[data-testid="v3-app-container__categories"] span')
      .toArray()
      .map((categoryElement) => $(categoryElement).text().replace(/,\s*$/g, '').trim())
      .filter(Boolean);

    results.push({
      appName: appLabel,
      appSlug,
      appUrl: appSlug ? `https://zapier.com/apps/${appSlug}` : null,
      detailsUrl,
      title: label || `Integrate ${appLabel} with ${appName ?? humanizeSlug(currentSlug)}`,
      iconUrl: toAbsoluteUrl(anchor.find('img').first().attr('src')?.trim() ?? null, pageUrl),
      categories
    });

    seen.add(detailsUrl);
  });

  return results;
}

export async function fetchZapierAppIntegrations(
  input: ZapierAppIntegrationsInput
): Promise<ZapierAppIntegrationsResult> {
  const searchUrl = `https://zapier.com/apps/search?q=${encodeURIComponent(input.query)}`;
  const candidateSlugs = buildCandidateSlugs(input.query);

  for (const candidateSlug of candidateSlugs) {
    const pageUrl = `https://zapier.com/apps/${candidateSlug}/integrations`;
    const response = await stealthGet(pageUrl, {
      timeoutMs: input.timeoutMs,
      provider: 'zapier.com',
      throwHttpErrors: false
    });

    if (response.statusCode >= 400) {
      continue;
    }

    const $ = cheerio.load(response.body);
    const title = $('title').first().text().trim() || null;
    const canonicalUrl = $('link[rel="canonical"]').attr('href')?.trim() || pageUrl;
    const resolvedSlug = canonicalUrl.match(/\/apps\/([^/]+)\/integrations/i)?.[1]?.toLowerCase() ?? candidateSlug;
    const appName = parseAppNameFromTitle(title) ?? humanizeSlug(resolvedSlug);
    const description =
      getMetaContent($, 'meta[name="description"]') ?? getMetaContent($, 'meta[property="og:description"]');
    const imageUrl = getMetaContent($, 'meta[property="og:image"]');
    const jsonLd = parseZapierJsonLd($('script#one-app-page-ld-json').first().html()?.trim() ?? null);
    const featureList = readStringArray(jsonLd?.featureList).slice(0, 5);
    const integrationCount = parseIntegrationCount(description ?? readString(jsonLd?.description));
    const integrations = extractIntegrationCards($, resolvedSlug, canonicalUrl, appName, input.limit);
    const metadataParsed = Boolean(appName || description || canonicalUrl);
    const jsonLdParsed = Boolean(jsonLd);
    const integrationCardsParsed = integrations.length > 0;

    if (!metadataParsed && !jsonLdParsed && !integrationCardsParsed) {
      continue;
    }

    return {
      query: input.query,
      requestedSlug: candidateSlug,
      resolvedSlug,
      searchUrl,
      pageUrl,
      canonicalUrl,
      status: 'analyzed',
      source: 'zapier_app_integrations_html',
      app: {
        name: appName,
        description: readString(jsonLd?.description) ?? description,
        imageUrl: readString(jsonLd?.image) ?? imageUrl,
        installUrl: readString(jsonLd?.installUrl),
        featureList,
        integrationCount
      },
      integrationCardCount: integrations.length,
      integrations,
      evidence: {
        pageFetched: response.body.length > 0,
        metadataParsed,
        jsonLdParsed,
        integrationCardsParsed
      }
    };
  }

  throw new Error('zapier_app_integrations_unresolved');
}
