import { stealthGet } from '../httpClient';
import { assertHttpUrl, safeJsonParse } from '../validation';

const DEFAULT_LIMIT = 5;
const FALLBACK_LIMIT = 30;

type ShopifyPredictiveSearchResponse = {
  resources?: {
    results?: {
      products?: Array<Record<string, unknown>>;
    };
  };
};

type ShopifyProductsFeedResponse = {
  products?: Array<Record<string, unknown>>;
};

export type ShopifyProductSearchRequest = {
  storeUrl: string;
  query: string | null;
  timeoutMs: number;
  limit?: number;
};

export type ShopifyProductSummary = {
  id: number | string | null;
  title: string;
  handle: string | null;
  productUrl: string | null;
  vendor: string | null;
  type: string | null;
  price: string | null;
  available: boolean | null;
  imageUrl: string | null;
  imageAlt: string | null;
  tags: string[];
};

function normalizeStorefrontOrigin(storeUrl: string) {
  const parsed = new URL(assertHttpUrl(storeUrl));
  return parsed.origin;
}

function toStringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function toBooleanOrNull(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function toNumericIdentifier(value: unknown) {
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }

  return null;
}

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim());
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeProductUrl(rawUrl: string | null, storeOrigin: string, handle: string | null) {
  if (rawUrl) {
    return new URL(rawUrl, storeOrigin).toString();
  }

  if (handle) {
    return new URL(`/products/${handle}`, storeOrigin).toString();
  }

  return null;
}

function productPrice(value: Record<string, unknown>) {
  const directPrice = toStringOrNull(value.price);
  if (directPrice) {
    return directPrice;
  }

  const variants = Array.isArray(value.variants) ? value.variants : [];
  const variant = variants.find((item) => item && typeof item === 'object') as Record<string, unknown> | undefined;
  return variant ? toStringOrNull(variant.price) : null;
}

function normalizePredictiveProduct(product: Record<string, unknown>, storeOrigin: string): ShopifyProductSummary {
  const handle = toStringOrNull(product.handle);
  const featuredImage =
    product.featured_image && typeof product.featured_image === 'object'
      ? (product.featured_image as Record<string, unknown>)
      : null;

  return {
    id: toNumericIdentifier(product.id),
    title: toStringOrNull(product.title) ?? 'Untitled product',
    handle,
    productUrl: normalizeProductUrl(toStringOrNull(product.url), storeOrigin, handle),
    vendor: toStringOrNull(product.vendor),
    type: toStringOrNull(product.type),
    price: productPrice(product),
    available: toBooleanOrNull(product.available),
    imageUrl: toStringOrNull(product.image) ?? toStringOrNull(featuredImage?.url),
    imageAlt: toStringOrNull(featuredImage?.alt),
    tags: normalizeTags(product.tags)
  };
}

function normalizeProductsFeedProduct(product: Record<string, unknown>, storeOrigin: string): ShopifyProductSummary {
  const handle = toStringOrNull(product.handle);
  const image =
    product.image && typeof product.image === 'object'
      ? (product.image as Record<string, unknown>)
      : null;

  return {
    id: toNumericIdentifier(product.id),
    title: toStringOrNull(product.title) ?? 'Untitled product',
    handle,
    productUrl: normalizeProductUrl(null, storeOrigin, handle),
    vendor: toStringOrNull(product.vendor),
    type: toStringOrNull(product.product_type),
    price: productPrice(product),
    available: null,
    imageUrl: toStringOrNull(image?.src),
    imageAlt: toStringOrNull(image?.alt),
    tags: normalizeTags(product.tags)
  };
}

async function fetchPredictiveSearch(storeOrigin: string, query: string, timeoutMs: number, limit: number) {
  const searchUrl = new URL('/search/suggest.json', storeOrigin);
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('resources[type]', 'product');
  searchUrl.searchParams.set('resources[limit]', String(limit));
  searchUrl.searchParams.set('resources[options][unavailable_products]', 'hide');

  const response = await stealthGet(searchUrl.toString(), {
    timeoutMs,
    retryLimit: 0
  });
  const parsed = safeJsonParse<ShopifyPredictiveSearchResponse>(response.body, null);
  const products = parsed?.resources?.results?.products ?? [];

  return {
    source: 'shopify_predictive_search' as const,
    sourceUrl: searchUrl.toString(),
    products: products
      .filter((product): product is Record<string, unknown> => Boolean(product && typeof product === 'object'))
      .map((product) => normalizePredictiveProduct(product, storeOrigin))
  };
}

function filterProductsByQuery(products: ShopifyProductSummary[], query: string) {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  if (tokens.length === 0) {
    return products;
  }

  return products.filter((product) => {
    const haystack = `${product.title} ${product.vendor ?? ''} ${product.type ?? ''} ${product.tags.join(' ')}`.toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

async function fetchProductsFeed(storeOrigin: string, timeoutMs: number, limit: number, query: string | null) {
  const feedUrl = new URL('/products.json', storeOrigin);
  feedUrl.searchParams.set('limit', String(Math.max(limit, FALLBACK_LIMIT)));

  const response = await stealthGet(feedUrl.toString(), {
    timeoutMs,
    retryLimit: 0
  });
  const parsed = safeJsonParse<ShopifyProductsFeedResponse>(response.body, null);
  const products = (parsed?.products ?? [])
    .filter((product): product is Record<string, unknown> => Boolean(product && typeof product === 'object'))
    .map((product) => normalizeProductsFeedProduct(product, storeOrigin));

  const filtered = query ? filterProductsByQuery(products, query) : products;

  return {
    source: 'shopify_products_feed' as const,
    sourceUrl: feedUrl.toString(),
    products: filtered.slice(0, limit)
  };
}

export async function searchShopifyProducts(request: ShopifyProductSearchRequest) {
  const storeOrigin = normalizeStorefrontOrigin(request.storeUrl);
  const normalizedQuery = request.query?.trim() || null;
  const limit = request.limit ?? DEFAULT_LIMIT;

  if (normalizedQuery) {
    try {
      const predictive = await fetchPredictiveSearch(storeOrigin, normalizedQuery, request.timeoutMs, limit);
      if (predictive.products.length > 0) {
        return {
          storeUrl: storeOrigin,
          query: normalizedQuery,
          source: predictive.source,
          sourceUrl: predictive.sourceUrl,
          products: predictive.products,
          evidence: {
            livePredictiveSearch: true,
            liveProductsFeedFallback: false
          }
        };
      }
    } catch {
      // Fall back to the products feed if predictive search is unavailable.
    }
  }

  const productsFeed = await fetchProductsFeed(storeOrigin, request.timeoutMs, limit, normalizedQuery);
  return {
    storeUrl: storeOrigin,
    query: normalizedQuery,
    source: productsFeed.source,
    sourceUrl: productsFeed.sourceUrl,
    products: productsFeed.products,
    evidence: {
      livePredictiveSearch: false,
      liveProductsFeedFallback: true
    }
  };
}
