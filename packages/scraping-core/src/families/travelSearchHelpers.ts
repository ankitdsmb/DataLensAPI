import { createHelperResponse } from './helperContracts';

type TravelProvider = 'skyscanner' | 'tripadvisor' | 'vrbo';
type TravelVertical = 'car_hire' | 'hotels' | 'cruises' | 'vacation_rentals';

type TravelHelperInput = {
  provider: TravelProvider;
  vertical: TravelVertical;
  location: string;
  searchUrl: string;
  productLabel: string;
  notes: string;
  routeRole?: 'primary' | 'compatibility';
};

export function buildSkyscannerCarHireUrl(location: string) {
  return `https://www.skyscanner.com/carhire/search?pickup=${encodeURIComponent(location)}`;
}

export function buildSkyscannerHotelUrl(location: string) {
  return `https://www.skyscanner.com/hotels/search?query=${encodeURIComponent(location)}`;
}

export function buildTripadvisorCruisesUrl(location: string) {
  return `https://www.tripadvisor.com/Search?q=${encodeURIComponent(location)}+cruise`;
}

export function buildTripadvisorHotelsUrl(location: string) {
  return `https://www.tripadvisor.com/Search?q=${encodeURIComponent(location)}+hotels`;
}

export function buildVrboUrl(location: string) {
  return `https://www.vrbo.com/search/keywords:${encodeURIComponent(location)}`;
}

export function createTravelSearchHelper(input: TravelHelperInput) {
  return createHelperResponse({
    status: 'helper_only',
    source: `${input.provider}_${input.vertical}_search_url`,
    fields: {
      provider: input.provider,
      vertical: input.vertical,
      helperFamily: 'travel-search-helpers',
      routeRole: input.routeRole ?? 'primary',
      location: input.location,
      searchUrl: input.searchUrl
    },
    contract: {
      productLabel: input.productLabel,
      forensicCategory: 'shallow-local-utility',
      implementationDepth: 'helper',
      launchRecommendation: 'public_lite',
      notes: input.notes
    }
  });
}

type TravelBulkItem = {
  location: string;
  searchUrl: string;
};

type TravelBulkHelperInput = {
  provider: TravelProvider;
  vertical: TravelVertical;
  results: TravelBulkItem[];
  productLabel: string;
  notes: string;
  compatibilityTarget?: string;
};

export function createTravelBulkHelper(input: TravelBulkHelperInput) {
  return createHelperResponse({
    status: 'compatibility_wrapper',
    source: `${input.provider}_${input.vertical}_search_url`,
    fields: {
      provider: input.provider,
      vertical: input.vertical,
      helperFamily: 'travel-search-helpers',
      compatibilityTarget: input.compatibilityTarget ?? null,
      resultCount: input.results.length,
      results: input.results
    },
    contract: {
      productLabel: input.productLabel,
      forensicCategory: 'shallow-local-utility',
      implementationDepth: 'helper',
      launchRecommendation: 'public_lite',
      notes: input.notes
    }
  });
}
