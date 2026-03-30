import {
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const regionPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const PLAYER_RESPONSE_MARKER = 'var ytInitialPlayerResponse = ';

type YoutubePlayerResponse = {
  playabilityStatus?: {
    status?: unknown;
    playableInEmbed?: unknown;
    reason?: unknown;
  };
  videoDetails?: {
    title?: unknown;
    author?: unknown;
    lengthSeconds?: unknown;
    shortDescription?: unknown;
    thumbnail?: {
      thumbnails?: Array<{
        url?: unknown;
        width?: unknown;
        height?: unknown;
      }>;
    };
  };
  microformat?: {
    playerMicroformatRenderer?: {
      availableCountries?: unknown;
      ownerProfileUrl?: unknown;
      externalChannelId?: unknown;
      isFamilySafe?: unknown;
      category?: unknown;
      publishDate?: unknown;
      uploadDate?: unknown;
      viewCount?: unknown;
    };
  };
};

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim().toUpperCase() : null))
    .filter((entry): entry is string => Boolean(entry));
}

function extractBalancedJsonObject(html: string, marker: string): string | null {
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  const jsonStart = html.indexOf('{', markerIndex + marker.length);
  if (jsonStart < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let index = jsonStart; index < html.length; index += 1) {
    const char = html[index];

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
        return html.slice(jsonStart, index + 1);
      }
    }
  }

  return null;
}

function parsePlayerResponse(html: string): YoutubePlayerResponse | null {
  const json = extractBalancedJsonObject(html, PLAYER_RESPONSE_MARKER);
  if (!json) {
    return null;
  }

  try {
    return JSON.parse(json) as YoutubePlayerResponse;
  } catch {
    return null;
  }
}

function pickLargestThumbnail(
  thumbnails: Array<{ url?: unknown; width?: unknown; height?: unknown }> | undefined
): string | null {
  if (!Array.isArray(thumbnails) || thumbnails.length === 0) {
    return null;
  }

  const best = [...thumbnails]
    .filter((thumbnail) => typeof thumbnail?.url === 'string')
    .sort((left, right) => {
      const leftArea = (typeof left.width === 'number' ? left.width : 0) * (typeof left.height === 'number' ? left.height : 0);
      const rightArea =
        (typeof right.width === 'number' ? right.width : 0) * (typeof right.height === 'number' ? right.height : 0);
      return rightArea - leftArea;
    })[0];

  return readString(best?.url);
}

export const POST = withScrapingHandler({ policy: regionPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, regionPolicy);
  requireAllowedFields(body, ['videoId']);
  const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';

  if (!videoId) {
    throw new RequestValidationError('videoId is required', { field: 'videoId' });
  }

  if (!VIDEO_ID_PATTERN.test(videoId)) {
    throw new RequestValidationError('videoId must be a valid 11-character YouTube video id', {
      field: 'videoId'
    });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const { html, $ } = await fetchHtmlDocument(videoUrl, { timeoutMs: regionPolicy.timeoutMs });
  const playerResponse = parsePlayerResponse(html);

  const metaTitle = readString($('meta[property="og:title"]').attr('content')) ?? readString($('title').text());
  const metaDescription = readString($('meta[name="description"]').attr('content'));

  if (!playerResponse) {
    return {
      videoId,
      videoUrl,
      status: 'unresolved',
      title: metaTitle,
      description: metaDescription,
      source: 'youtube_watch_html',
      contract: {
        productLabel: 'YouTube Region Availability Checker (Lite)',
        forensicCategory: 'html-scraper',
        implementationDepth: 'partial',
        launchRecommendation: 'public_lite',
        notes:
          'Fetched the public YouTube watch page, but could not parse the embedded player response. This route does not independently simulate playback from every country.'
      }
    };
  }

  const playabilityStatus = readString(playerResponse.playabilityStatus?.status) ?? 'UNKNOWN';
  const availableCountries = readStringArray(playerResponse.microformat?.playerMicroformatRenderer?.availableCountries);
  const thumbnailUrl = pickLargestThumbnail(playerResponse.videoDetails?.thumbnail?.thumbnails);
  const ownerProfileUrl = readString(playerResponse.microformat?.playerMicroformatRenderer?.ownerProfileUrl);

  return {
    videoId,
    videoUrl,
    status: 'analyzed',
    source: 'youtube_watch_player_response',
    title: readString(playerResponse.videoDetails?.title) ?? metaTitle,
    description: readString(playerResponse.videoDetails?.shortDescription) ?? metaDescription,
    channelName: readString(playerResponse.videoDetails?.author),
    channelId: readString(playerResponse.microformat?.playerMicroformatRenderer?.externalChannelId),
    channelUrl: ownerProfileUrl ? new URL(ownerProfileUrl, 'https://www.youtube.com').toString() : null,
    thumbnailUrl,
    playabilityStatus,
    playableInEmbed: readBoolean(playerResponse.playabilityStatus?.playableInEmbed),
    playabilityReason: readString(playerResponse.playabilityStatus?.reason),
    availableCountryCount: availableCountries.length,
    availableCountries,
    category: readString(playerResponse.microformat?.playerMicroformatRenderer?.category),
    isFamilySafe: readBoolean(playerResponse.microformat?.playerMicroformatRenderer?.isFamilySafe),
    publishDate: readString(playerResponse.microformat?.playerMicroformatRenderer?.publishDate),
    uploadDate: readString(playerResponse.microformat?.playerMicroformatRenderer?.uploadDate),
    viewCount: readString(playerResponse.microformat?.playerMicroformatRenderer?.viewCount),
    evidence: {
      watchPageFetched: true,
      playerResponseParsed: true,
      countryAvailabilityListPresent: availableCountries.length > 0
    },
    contract: {
      productLabel: 'YouTube Region Availability Checker (Lite)',
      forensicCategory: 'html-scraper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Fetches the public YouTube watch page and parses playability plus availableCountries evidence. It does not independently simulate playback from each country or guarantee per-market playback.'
    }
  };
});
