import type { ToolExecutionPolicy } from '../../shared-types/src';
import { RequestValidationError } from './validation';

type LaunchProfile = {
  route: string;
  authRequired?: boolean;
  freeTierEligible: boolean;
  visibility?: ToolExecutionPolicy['visibility'];
  timeoutMs?: number;
  maxUrlCount?: number;
  maxKeywordCount?: number;
  maxCrawlPages?: number;
  maxBulkItems?: number;
  maxPayloadBytes?: number;
  rateLimitPerMinute?: number;
  maxConcurrentRequests?: number;
};

const FREE_TIER_SAFE_ROUTES = new Set<string>([
  '/api/v1/seo-tools/url-shortener',
  '/api/v1/seo-tools/markdown-table-generator',
  '/api/v1/seo-tools/profanity-checker',
  '/api/v1/seo-tools/reverse-dictionary-api',
  '/api/v1/seo-tools/social-media-hashtag-generator',
  '/api/v1/seo-tools/search-keyword-research',
  '/api/v1/seo-tools/youtube-suggester',
  '/api/v1/seo-tools/google-autocomplete-apify',
  '/api/v1/seo-tools/ebay-keywords-discovery-tool',
  '/api/v1/seo-tools/app-store-search-suggestions'
]);

const REJECTED_PUBLIC_CATALOG_ROUTES = new Set<string>([
  '/api/v1/seo-tools/web-traffic-boots',
  '/api/v1/seo-tools/new-web-traffic-generator-youtube-vimeo-twitch',
  '/api/v1/seo-tools/website-traffic-generator-pro',
  '/api/v1/seo-tools/traffic-generator-youtube-web-etsy-behance-and-many-more',
  '/api/v1/seo-tools/website-traffic-machine',
  '/api/v1/seo-tools/websites-traffic-generator',
  '/api/v1/seo-tools/smart-website-traffic',
  '/api/v1/seo-tools/web-traffic-spike-simulator-x',
  '/api/v1/seo-tools/organic-visit-simulator-x',
  '/api/v1/seo-tools/traffic-booster',
  '/api/v1/seo-tools/youtube-view-generator',
  '/api/v1/seo-tools/youtube-view-generator-124-test-events-124-0001'
]);

const launchProfiles: LaunchProfile[] = [
  ...Array.from(FREE_TIER_SAFE_ROUTES).map((route) => ({
    route,
    freeTierEligible: true,
    visibility: 'public' as const,
    authRequired: true,
    timeoutMs: 8000,
    maxUrlCount: 5,
    maxKeywordCount: 12,
    maxCrawlPages: 25,
    maxBulkItems: 10,
    rateLimitPerMinute: 20,
    maxConcurrentRequests: 2
  })),
  {
    route: '/api/v1/seo-tools/snapify-capture-screenshot-save-pdf',
    freeTierEligible: false,
    visibility: 'internal' as const
  },
  {
    route: '/api/v1/seo-tools/trayvmy-actor',
    freeTierEligible: false,
    visibility: 'internal' as const
  },
  {
    route: '/api/v1/seo-tools/web-traffic-boots',
    freeTierEligible: false,
    visibility: 'disabled' as const
  },
  {
    route: '/api/v1/seo-tools/new-web-traffic-generator-youtube-vimeo-twitch',
    freeTierEligible: false,
    visibility: 'disabled' as const
  },
  {
    route: '/api/v1/seo-tools/website-traffic-generator-pro',
    freeTierEligible: false,
    visibility: 'disabled' as const
  },
  {
    route: '/api/v1/seo-tools/traffic-generator-youtube-web-etsy-behance-and-many-more',
    freeTierEligible: false,
    visibility: 'disabled' as const
  },
  {
    route: '/api/v1/seo-tools/website-traffic-machine',
    freeTierEligible: false,
    visibility: 'disabled' as const
  },
  {
    route: '/api/v1/seo-tools/websites-traffic-generator',
    freeTierEligible: false,
    visibility: 'disabled' as const
  },
  {
    route: '/api/v1/seo-tools/smart-website-traffic',
    freeTierEligible: false,
    visibility: 'disabled' as const
  },
  {
    route: '/api/v1/seo-tools/web-traffic-spike-simulator-x',
    freeTierEligible: false,
    visibility: 'disabled' as const
  },
  {
    route: '/api/v1/seo-tools/organic-visit-simulator-x',
    freeTierEligible: false,
    visibility: 'disabled' as const
  },
  {
    route: '/api/v1/seo-tools/traffic-booster',
    freeTierEligible: false,
    visibility: 'disabled' as const
  }
];

const launchProfileMap = new Map(launchProfiles.map((profile) => [profile.route, profile]));

const rateWindowMs = 60_000;
const rateUsage = new Map<string, { count: number; windowStart: number }>();
const routeConcurrency = new Map<string, number>();

function normalizePath(url: string): string {
  return new URL(url).pathname;
}

function isSuspiciousRoute(pathname: string): boolean {
  return /(traffic|boost|simulator|organic-visit|bot)/i.test(pathname);
}

function isFreeTierLaunchMode(): boolean {
  return (process.env.FREE_TIER_LAUNCH_MODE ?? 'true').toLowerCase() !== 'false';
}

function getApiKey(req: Request): string {
  const bearer = req.headers.get('authorization');
  if (bearer?.startsWith('Bearer ')) {
    return bearer.replace('Bearer ', '').trim();
  }

  return req.headers.get('x-api-key')?.trim() ?? '';
}

function isApiKeyAuthorized(req: Request): boolean {
  const configuredKeys = (process.env.FREE_TIER_API_KEYS ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);

  if (configuredKeys.length === 0) {
    return false;
  }

  const key = getApiKey(req);
  return configuredKeys.includes(key);
}

function enforceRateLimit(req: Request, pathname: string, policy: ToolExecutionPolicy): void {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const existing = rateUsage.get(key);

  if (!existing || now - existing.windowStart >= rateWindowMs) {
    rateUsage.set(key, { count: 1, windowStart: now });
    return;
  }

  if (existing.count >= policy.rateLimitPerMinute) {
    throw new RequestValidationError('rate limit exceeded for this route', {
      route: pathname,
      limit: policy.rateLimitPerMinute,
      windowMs: rateWindowMs
    });
  }

  existing.count += 1;
}

export function resolveLaunchPolicy(req: Request, policy: ToolExecutionPolicy): ToolExecutionPolicy {
  const pathname = normalizePath(req.url);
  const profile = launchProfileMap.get(pathname);

  if (REJECTED_PUBLIC_CATALOG_ROUTES.has(pathname)) {
    return {
      ...policy,
      freeTierEligible: false,
      visibility: 'disabled'
    };
  }

  if (isFreeTierLaunchMode() && !FREE_TIER_SAFE_ROUTES.has(pathname)) {
    return {
      ...policy,
      freeTierEligible: false,
      visibility: 'internal'
    };
  }

  if (profile) {
    return {
      ...policy,
      ...profile
    };
  }

  return policy;
}

export function enforceLaunchPolicy(req: Request, policy: ToolExecutionPolicy): void {
  const pathname = normalizePath(req.url);

  if (REJECTED_PUBLIC_CATALOG_ROUTES.has(pathname)) {
    throw new RequestValidationError('route is rejected from the public catalog for launch governance reasons', {
      route: pathname,
      reason: 'traffic_or_fake_engagement_tool'
    });
  }

  if (policy.visibility === 'disabled') {
    throw new RequestValidationError('route is disabled for public launch', { route: pathname });
  }

  if (policy.visibility === 'internal') {
    throw new RequestValidationError('route is internal-only for launch profile', { route: pathname });
  }

  if (!policy.freeTierEligible || isSuspiciousRoute(pathname)) {
    throw new RequestValidationError('route is quarantined from free-tier public launch', { route: pathname });
  }

  if ((policy.authRequired || !policy.anonymous) && !isApiKeyAuthorized(req)) {
    const authError = new RequestValidationError('valid API key is required for this route', {
      route: pathname,
      acceptedHeaders: ['x-api-key', 'authorization: Bearer <key>']
    });
    authError.status = 401;
    authError.code = 'unauthorized';
    throw authError;
  }

  enforceRateLimit(req, pathname, policy);
}

export function acquireConcurrencyLease(req: Request, policy: ToolExecutionPolicy): () => void {
  const pathname = normalizePath(req.url);
  const current = routeConcurrency.get(pathname) ?? 0;

  if (current >= policy.maxConcurrentRequests) {
    const concurrencyError = new RequestValidationError('route concurrency limit reached', {
      route: pathname,
      maxConcurrentRequests: policy.maxConcurrentRequests
    });
    concurrencyError.status = 429;
    concurrencyError.code = 'rate_limited';
    throw concurrencyError;
  }

  routeConcurrency.set(pathname, current + 1);

  return () => {
    const active = routeConcurrency.get(pathname) ?? 1;
    if (active <= 1) {
      routeConcurrency.delete(pathname);
      return;
    }

    routeConcurrency.set(pathname, active - 1);
  };
}

export function getFreeTierSafeRoutes(): string[] {
  return Array.from(FREE_TIER_SAFE_ROUTES);
}

export function getRejectedPublicCatalogRoutes(): string[] {
  return Array.from(REJECTED_PUBLIC_CATALOG_ROUTES);
}
