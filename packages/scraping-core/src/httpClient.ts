import { gotScraping, type OptionsInit } from 'got-scraping';
import { DEFAULT_TOOL_POLICY } from './policy';
import { elapsedMs, logEvent, logTiming, startTiming } from './observability';

type RequestProfile = 'desktop' | 'mobile';

type StealthRequestOptions = OptionsInit & {
  timeoutMs?: number;
  retryLimit?: number;
  provider?: string;
};

export type StealthResponse = {
  body: string;
  headers: Record<string, string | string[] | undefined>;
  redirectUrls: string[];
  statusCode: number;
};

function buildStealthOptions(profile: RequestProfile, options: StealthRequestOptions): OptionsInit {
  const { timeoutMs, retryLimit, provider, ...gotOptions } = options;
  const requestTimeout =
    gotOptions.timeout?.request ??
    timeoutMs ??
    DEFAULT_TOOL_POLICY.timeoutMs;
  const computedRetryLimit =
    gotOptions.retry?.limit ??
    retryLimit ??
    1;

  const headerGeneratorOptions =
    profile === 'mobile'
      ? { browsers: ['safari'], os: ['ios'], devices: ['mobile'] }
      : { browsers: ['chrome'], os: ['windows', 'macos'] };

  return {
    ...gotOptions,
    headerGeneratorOptions,
    timeout: {
      ...gotOptions.timeout,
      request: requestTimeout
    },
    retry: {
      ...gotOptions.retry,
      limit: computedRetryLimit
    }
  };
}

async function requestWithProfile(
  url: string,
  profile: RequestProfile,
  options: StealthRequestOptions = {}
): Promise<StealthResponse> {
  const startTime = startTiming();
  const provider = options.provider ?? new URL(url).hostname;
  const method =
    typeof options.method === 'string' && options.method.trim().length > 0
      ? options.method.toUpperCase()
      : 'GET';

  logEvent('info', 'provider.request.started', {
    provider,
    profile,
    method,
    url
  });

  try {
    const response = (await gotScraping(url, buildStealthOptions(profile, options))) as StealthResponse;
    logTiming('provider.request.completed', startTime, {
      provider,
      profile,
      method,
      url,
      status_code: response.statusCode
    });
    return response;
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error('provider_request_failed');
    logEvent('error', 'provider.request.failed', {
      provider,
      profile,
      method,
      url,
      duration_ms: elapsedMs(startTime),
      error_message: normalized.message
    });
    throw error;
  }
}

export function stealthGet(url: string, options: StealthRequestOptions = {}) {
  return requestWithProfile(url, 'desktop', {
    ...options,
    method: 'GET'
  });
}

export function stealthMobileGet(url: string, options: StealthRequestOptions = {}) {
  return requestWithProfile(url, 'mobile', {
    ...options,
    method: 'GET'
  });
}

export function stealthPostForm(
  url: string,
  fields: Record<string, string>,
  options: StealthRequestOptions = {}
) {
  const body = new URLSearchParams(fields).toString();

  return requestWithProfile(url, 'desktop', {
    ...options,
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
      ...(options.headers ?? {})
    },
    body
  });
}
