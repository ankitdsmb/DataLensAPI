import { stealthGet } from '../httpClient';
import { RequestValidationError, safeJsonParse } from '../validation';

type TrancoListMetadata = {
  list_id?: string;
  available?: boolean;
  download?: string;
  created_on?: string;
};

export type TrancoSiteRank = {
  rank: number;
  domain: string;
};

export type TrancoGlobalPopularityResult = {
  status: 'global_rank_snapshot';
  scope: 'global';
  requestedCountry: string | null;
  countryScopeApplied: false;
  listId: string;
  createdOn: string | null;
  downloadUrl: string;
  siteCount: number;
  sites: TrancoSiteRank[];
  evidence: {
    metadataFetched: boolean;
    listDownloaded: boolean;
    rowsParsed: boolean;
  };
};

export type TrancoGlobalPopularityInput = {
  limit: number;
  timeoutMs: number;
  country?: string | null;
  apiBaseUrl?: string;
};

const DEFAULT_TRANCO_API_BASE_URL = 'https://tranco-list.eu/api';

function normalizeLimit(value: number) {
  if (!Number.isFinite(value)) {
    return 100;
  }

  return Math.max(1, Math.min(1000, Math.trunc(value)));
}

function normalizeCountry(value: string | null | undefined) {
  const trimmed = value?.trim().toUpperCase();
  if (!trimmed) {
    return null;
  }

  const safe = trimmed.replace(/[^A-Z]/g, '');
  return safe.length >= 2 ? safe.slice(0, 2) : null;
}

function normalizeApiBaseUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return DEFAULT_TRANCO_API_BASE_URL;
  }

  return trimmed.replace(/\/+$/, '');
}

function parseCsvLine(line: string) {
  const [rankRaw, domainRaw] = line.split(',', 2);
  const rank = Number(rankRaw);
  const domain = domainRaw?.trim();

  if (!Number.isFinite(rank) || !domain) {
    return null;
  }

  return {
    rank,
    domain
  };
}

export async function fetchTrancoGlobalPopularity(
  input: TrancoGlobalPopularityInput
): Promise<TrancoGlobalPopularityResult> {
  const limit = normalizeLimit(input.limit);
  const requestedCountry = normalizeCountry(input.country);
  const apiBaseUrl = normalizeApiBaseUrl(input.apiBaseUrl ?? process.env.TRANCO_API_BASE_URL);
  const metadataUrl = `${apiBaseUrl}/lists/date/latest`;

  const metadataResponse = await stealthGet(metadataUrl, {
    timeoutMs: input.timeoutMs,
    provider: 'tranco-list.eu',
    throwHttpErrors: false,
    headers: {
      accept: 'application/json'
    }
  });

  const metadata = safeJsonParse<TrancoListMetadata>(metadataResponse.body, null);
  const downloadUrl = metadata?.download?.trim() ?? '';
  const listId = metadata?.list_id?.trim() ?? '';

  if (!downloadUrl || !listId) {
    throw new RequestValidationError('unable to retrieve Tranco latest-list metadata', {
      source: metadataUrl
    });
  }

  const listResponse = await stealthGet(downloadUrl, {
    timeoutMs: input.timeoutMs,
    provider: 'tranco-list.eu',
    throwHttpErrors: false,
    headers: {
      accept: 'text/plain'
    }
  });

  const sites = listResponse.body
    .split(/\r?\n/)
    .map((line) => parseCsvLine(line.trim()))
    .filter((site): site is TrancoSiteRank => Boolean(site))
    .slice(0, limit);

  return {
    status: 'global_rank_snapshot',
    scope: 'global',
    requestedCountry,
    countryScopeApplied: false,
    listId,
    createdOn: metadata?.created_on?.trim() ?? null,
    downloadUrl,
    siteCount: sites.length,
    sites,
    evidence: {
      metadataFetched: metadataResponse.statusCode >= 200 && metadataResponse.statusCode < 400,
      listDownloaded: listResponse.statusCode >= 200 && listResponse.statusCode < 400,
      rowsParsed: sites.length > 0
    }
  };
}
