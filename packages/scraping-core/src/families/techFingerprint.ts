import { load } from 'cheerio';
import { getAttribute } from '../html';
import { stealthGet } from '../httpClient';

type TechnologyCategory = 'cms' | 'frontend' | 'ecommerce' | 'analytics' | 'infrastructure';

type DetectionRule = {
  name: string;
  category: TechnologyCategory;
  patterns: RegExp[];
};

const DETECTION_RULES: DetectionRule[] = [
  { name: 'WordPress', category: 'cms', patterns: [/wp-content/i, /wp-includes/i, /wordpress/i] },
  { name: 'Shopify', category: 'cms', patterns: [/cdn\.shopify\.com/i, /shopify/i] },
  { name: 'Shopify', category: 'ecommerce', patterns: [/cdn\.shopify\.com/i, /shopify/i] },
  { name: 'WooCommerce', category: 'cms', patterns: [/woocommerce/i] },
  { name: 'WooCommerce', category: 'ecommerce', patterns: [/woocommerce/i] },
  { name: 'Wix', category: 'cms', patterns: [/wixstatic\.com/i, /wix\.com/i] },
  { name: 'Squarespace', category: 'cms', patterns: [/squarespace/i, /static\.squarespace\.com/i] },
  { name: 'Webflow', category: 'cms', patterns: [/webflow/i] },
  { name: 'Joomla', category: 'cms', patterns: [/joomla/i, /com_content/i] },
  { name: 'Drupal', category: 'cms', patterns: [/drupal/i, /sites\/default/i] },
  { name: 'Ghost', category: 'cms', patterns: [/ghost/i, /ghost-content/i] },
  { name: 'BigCommerce', category: 'cms', patterns: [/bigcommerce/i, /cdn\d+\.bigcommerce\.com/i] },
  { name: 'BigCommerce', category: 'ecommerce', patterns: [/bigcommerce/i, /cdn\d+\.bigcommerce\.com/i] },
  { name: 'Next.js', category: 'frontend', patterns: [/__NEXT_DATA__/i, /\/_next\//i, /next\.js/i] },
  { name: 'React', category: 'frontend', patterns: [/react/i, /data-reactroot/i, /__REACT_DEVTOOLS/i] },
  { name: 'Vue', category: 'frontend', patterns: [/vue/i, /data-server-rendered/i] },
  { name: 'Nuxt', category: 'frontend', patterns: [/__nuxt/i, /nuxt/i] },
  { name: 'Angular', category: 'frontend', patterns: [/ng-version/i, /angular/i] },
  { name: 'Gatsby', category: 'frontend', patterns: [/___gatsby/i, /gatsby/i] },
  { name: 'Astro', category: 'frontend', patterns: [/astro-island/i, /\/_astro\//i] },
  { name: 'SvelteKit', category: 'frontend', patterns: [/sveltekit/i, /\/_app\/immutable\//i] },
  { name: 'Google Tag Manager', category: 'analytics', patterns: [/googletagmanager\.com/i] },
  { name: 'Google Analytics', category: 'analytics', patterns: [/google-analytics\.com/i, /gtag\/js/i, /ga4/i] },
  { name: 'Meta Pixel', category: 'analytics', patterns: [/connect\.facebook\.net\/.*fbevents\.js/i, /fbq\(/i] },
  { name: 'Hotjar', category: 'analytics', patterns: [/hotjar/i] },
  { name: 'Segment', category: 'analytics', patterns: [/segment\.com/i, /analytics-next/i] },
  { name: 'Cloudflare', category: 'infrastructure', patterns: [/cf-ray/i, /cloudflare/i] },
  { name: 'Vercel', category: 'infrastructure', patterns: [/x-vercel/i, /vercel/i] },
  { name: 'Netlify', category: 'infrastructure', patterns: [/netlify/i] },
  { name: 'CloudFront', category: 'infrastructure', patterns: [/cloudfront/i, /x-amz-cf/i] }
];

export type TechFingerprintRequest = {
  url: string;
  timeoutMs: number;
};

export type TechFingerprintResult =
  | {
      url: string;
      status: 'analyzed';
      finalUrl: string;
      statusCode: number | null;
      contentType: string | null;
      generator: string | null;
      technologies: string[];
      categories: Record<TechnologyCategory, string[]>;
      signals: {
        scriptCount: number;
        stylesheetCount: number;
        metaGeneratorPresent: boolean;
        fingerprintCount: number;
      };
      evidence: {
        htmlFetched: true;
        headersInspected: true;
        resourceUrlsParsed: true;
        metaParsed: true;
      };
    }
  | {
      url: string;
      status: 'fetch_failed';
      finalUrl: null;
      statusCode: null;
      contentType: null;
      error: string;
      technologies: [];
      categories: Record<TechnologyCategory, []>;
      signals: {
        scriptCount: 0;
        stylesheetCount: 0;
        metaGeneratorPresent: false;
        fingerprintCount: 0;
      };
      evidence: {
        htmlFetched: false;
        headersInspected: false;
        resourceUrlsParsed: false;
        metaParsed: false;
      };
    };

function normalizeHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function emptyCategories(): Record<TechnologyCategory, []> {
  return {
    cms: [],
    frontend: [],
    ecommerce: [],
    analytics: [],
    infrastructure: []
  };
}

function buildCategories(): Record<TechnologyCategory, string[]> {
  return {
    cms: [],
    frontend: [],
    ecommerce: [],
    analytics: [],
    infrastructure: []
  };
}

function addTechnology(target: Record<TechnologyCategory, string[]>, category: TechnologyCategory, name: string) {
  if (!target[category].includes(name)) {
    target[category].push(name);
  }
}

function collectFingerprints(html: string, resourceUrls: string[], headersText: string) {
  const haystack = `${html}\n${resourceUrls.join('\n')}\n${headersText}`;
  const categories = buildCategories();

  for (const rule of DETECTION_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) {
      addTechnology(categories, rule.category, rule.name);
    }
  }

  return categories;
}

export async function inspectTechFingerprint(request: TechFingerprintRequest): Promise<TechFingerprintResult> {
  try {
    const response = await stealthGet(request.url, {
      timeoutMs: request.timeoutMs,
      throwHttpErrors: false
    });
    const finalUrl = response.redirectUrls?.length
      ? response.redirectUrls[response.redirectUrls.length - 1]
      : request.url;
    const $ = load(response.body);
    const resourceUrls = [
      ...$('script[src]')
        .toArray()
        .map((element) => $(element).attr('src')?.trim())
        .filter((value): value is string => Boolean(value)),
      ...$('link[href]')
        .toArray()
        .map((element) => $(element).attr('href')?.trim())
        .filter((value): value is string => Boolean(value))
    ];
    const headersText = Object.entries(response.headers)
      .flatMap(([key, value]) => {
        if (Array.isArray(value)) {
          return value.map((item) => `${key}:${item}`);
        }

        return value ? [`${key}:${value}`] : [];
      })
      .join('\n');
    const categories = collectFingerprints(response.body, resourceUrls, headersText);
    const generator = getAttribute($, 'meta[name="generator"]', 'content');

    if (generator) {
      const generatorText = generator.toLowerCase();
      if (generatorText.includes('wordpress')) {
        addTechnology(categories, 'cms', 'WordPress');
      } else if (generatorText.includes('shopify')) {
        addTechnology(categories, 'cms', 'Shopify');
        addTechnology(categories, 'ecommerce', 'Shopify');
      } else if (generatorText.includes('drupal')) {
        addTechnology(categories, 'cms', 'Drupal');
      } else if (generatorText.includes('joomla')) {
        addTechnology(categories, 'cms', 'Joomla');
      } else if (generatorText.includes('ghost')) {
        addTechnology(categories, 'cms', 'Ghost');
      }
    }

    const technologies = [
      ...categories.cms,
      ...categories.frontend,
      ...categories.ecommerce,
      ...categories.analytics,
      ...categories.infrastructure
    ];

    return {
      url: request.url,
      status: 'analyzed',
      finalUrl,
      statusCode: response.statusCode ?? null,
      contentType: normalizeHeaderValue(response.headers['content-type']),
      generator,
      technologies,
      categories,
      signals: {
        scriptCount: $('script[src]').length,
        stylesheetCount: $('link[rel="stylesheet"]').length,
        metaGeneratorPresent: Boolean(generator),
        fingerprintCount: technologies.length
      },
      evidence: {
        htmlFetched: true,
        headersInspected: true,
        resourceUrlsParsed: true,
        metaParsed: true
      }
    };
  } catch (error) {
    return {
      url: request.url,
      status: 'fetch_failed',
      finalUrl: null,
      statusCode: null,
      contentType: null,
      error: error instanceof Error ? error.message : 'fetch_failed',
      technologies: [],
      categories: emptyCategories(),
      signals: {
        scriptCount: 0,
        stylesheetCount: 0,
        metaGeneratorPresent: false,
        fingerprintCount: 0
      },
      evidence: {
        htmlFetched: false,
        headersInspected: false,
        resourceUrlsParsed: false,
        metaParsed: false
      }
    };
  }
}
