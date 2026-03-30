import { fetchHtmlDocument } from '../html';

export type OpenTableSearchInput = {
  term: string;
  timeoutMs: number;
  limit: number;
};

export type OpenTableRestaurant = {
  restaurantId: number | null;
  name: string;
  profileUrl: string | null;
  priceBand: string | null;
  neighborhood: string | null;
  cuisine: string | null;
  rating: number | null;
  reviewCount: number | null;
  recentReservationCount: number | null;
  reservationMaxPartySize: number | null;
  features: {
    bar: boolean | null;
    outdoor: boolean | null;
    highTop: boolean | null;
  };
};

export type OpenTableSearchResult = {
  term: string;
  searchUrl: string;
  status: 'analyzed';
  source: 'opentable_search_state';
  restaurantCount: number;
  restaurants: OpenTableRestaurant[];
  evidence: {
    pageFetched: boolean;
    embeddedStateParsed: boolean;
    restaurantArrayParsed: boolean;
  };
};

type OpenTableRestaurantRaw = {
  restaurantId?: unknown;
  name?: unknown;
  urls?: {
    profileLink?: {
      link?: unknown;
    };
  };
  priceBand?: {
    name?: unknown;
  };
  neighborhood?: {
    name?: unknown;
  };
  primaryCuisine?: {
    name?: unknown;
  };
  statistics?: {
    recentReservationCount?: unknown;
    reviews?: {
      allTimeTextReviewCount?: unknown;
      ratings?: {
        overall?: {
          rating?: unknown;
        };
      };
    };
  };
  features?: {
    reservationMaxPartySize?: unknown;
    bar?: unknown;
    outdoor?: unknown;
    highTop?: unknown;
  };
};

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

function readBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isRestaurantArray(value: unknown): value is OpenTableRestaurantRaw[] {
  return (
    Array.isArray(value) &&
    value.some((item) => isRecord(item) && ('restaurantId' in item || 'urls' in item || 'primaryCuisine' in item))
  );
}

function findFirstRestaurantArray(value: unknown): OpenTableRestaurantRaw[] | null {
  if (isRestaurantArray(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstRestaurantArray(item);
      if (found) {
        return found;
      }
    }

    return null;
  }

  if (isRecord(value)) {
    for (const nested of Object.values(value)) {
      const found = findFirstRestaurantArray(nested);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function mapRestaurant(raw: OpenTableRestaurantRaw): OpenTableRestaurant | null {
  const name = readString(raw.name);
  if (!name) {
    return null;
  }

  return {
    restaurantId: readNumber(raw.restaurantId),
    name,
    profileUrl: readString(raw.urls?.profileLink?.link),
    priceBand: readString(raw.priceBand?.name),
    neighborhood: readString(raw.neighborhood?.name),
    cuisine: readString(raw.primaryCuisine?.name),
    rating: readNumber(raw.statistics?.reviews?.ratings?.overall?.rating),
    reviewCount: readNumber(raw.statistics?.reviews?.allTimeTextReviewCount),
    recentReservationCount: readNumber(raw.statistics?.recentReservationCount),
    reservationMaxPartySize: readNumber(raw.features?.reservationMaxPartySize),
    features: {
      bar: readBoolean(raw.features?.bar),
      outdoor: readBoolean(raw.features?.outdoor),
      highTop: readBoolean(raw.features?.highTop)
    }
  };
}

function readInitialStatePayload(scriptText: string | null): unknown {
  if (!scriptText) {
    return null;
  }

  try {
    const parsed = JSON.parse(scriptText) as {
      windowVariables?: {
        __INITIAL_STATE__?: unknown;
      };
    };
    return parsed.windowVariables?.__INITIAL_STATE__ ?? null;
  } catch {
    return null;
  }
}

export async function searchOpenTableRestaurants(input: OpenTableSearchInput): Promise<OpenTableSearchResult> {
  const searchUrl = `https://www.opentable.com/s/?term=${encodeURIComponent(input.term)}`;
  const { $, html } = await fetchHtmlDocument(searchUrl, { timeoutMs: input.timeoutMs });

  const embeddedScript =
    $('script[type="application/json"]')
      .toArray()
      .map((element) => $(element).html()?.trim() ?? '')
      .find((text) => text.includes('__INITIAL_STATE__')) ?? null;

  const initialState = readInitialStatePayload(embeddedScript);
  const rawRestaurants = findFirstRestaurantArray(initialState) ?? [];
  const restaurants = rawRestaurants
    .map((restaurant) => mapRestaurant(restaurant))
    .filter((restaurant): restaurant is OpenTableRestaurant => Boolean(restaurant))
    .slice(0, input.limit);

  return {
    term: input.term,
    searchUrl,
    status: 'analyzed',
    source: 'opentable_search_state',
    restaurantCount: restaurants.length,
    restaurants,
    evidence: {
      pageFetched: html.length > 0,
      embeddedStateParsed: Boolean(initialState),
      restaurantArrayParsed: restaurants.length > 0
    }
  };
}
