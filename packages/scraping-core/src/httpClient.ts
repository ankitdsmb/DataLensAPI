import { gotScraping, type OptionsInit } from 'got-scraping';
import { DEFAULT_TOOL_POLICY } from './policy';

type RequestProfile = 'desktop' | 'mobile';

type StealthRequestOptions = OptionsInit & {
  timeoutMs?: number;
  retryLimit?: number;
};

export type StealthResponse = {
  body: string;
  headers: Record<string, string | string[] | undefined>;
  redirectUrls: string[];
  statusCode: number;
};

function buildStealthOptions(profile: RequestProfile, options: StealthRequestOptions): OptionsInit {
  const requestTimeout =
    options.timeout?.request ??
    options.timeoutMs ??
    DEFAULT_TOOL_POLICY.timeoutMs;
  const retryLimit =
    options.retry?.limit ??
    options.retryLimit ??
    1;

  const headerGeneratorOptions =
    profile === 'mobile'
      ? { browsers: ['safari'], os: ['ios'], devices: ['mobile'] }
      : { browsers: ['chrome'], os: ['windows', 'macos'] };

  return {
    ...options,
    headerGeneratorOptions,
    timeout: {
      ...options.timeout,
      request: requestTimeout
    },
    retry: {
      ...options.retry,
      limit: retryLimit
    }
  };
}

async function requestWithProfile(
  url: string,
  profile: RequestProfile,
  options: StealthRequestOptions = {}
): Promise<StealthResponse> {
  return gotScraping.get(url, buildStealthOptions(profile, options)) as Promise<StealthResponse>;
}

export function stealthGet(url: string, options: StealthRequestOptions = {}) {
  return requestWithProfile(url, 'desktop', options);
}

export function stealthMobileGet(url: string, options: StealthRequestOptions = {}) {
  return requestWithProfile(url, 'mobile', options);
}
