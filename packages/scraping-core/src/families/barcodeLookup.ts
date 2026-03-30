import { fetchHtmlDocument, getElementText, getMetaContent } from '../html';
import { stealthGet } from '../httpClient';
import { RequestValidationError, safeJsonParse, UpstreamApiError } from '../validation';

const OPEN_FOOD_FACTS_BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';

type OpenFoodFactsProduct = {
  product_name?: string;
  generic_name?: string;
  brands?: string;
  categories?: string;
  quantity?: string;
  packaging?: string;
  countries?: string;
  image_front_url?: string;
  image_thumb_url?: string;
  url?: string;
  nutriscore_grade?: string;
  ecoscore_grade?: string;
  allergens?: string;
};

type OpenFoodFactsResponse = {
  code?: string;
  status?: number;
  status_verbose?: string;
  product?: OpenFoodFactsProduct;
};

export type BarcodeLookupRequest = {
  code: string;
  timeoutMs: number;
};

function normalizeCode(code: string) {
  const normalized = code.trim().replace(/\s+/g, '');
  if (!normalized) {
    throw new RequestValidationError('code is required', { field: 'code' });
  }

  if (!/^\d{8,14}$/.test(normalized)) {
    throw new RequestValidationError('code must be 8-14 digits for EAN/UPC/GTIN lookups', {
      field: 'code'
    });
  }

  return normalized;
}

function detectFormat(code: string) {
  if (code.length === 8) return 'EAN-8';
  if (code.length === 12) return 'UPC-A';
  if (code.length === 13) return 'EAN-13';
  if (code.length === 14) return 'GTIN-14';
  return 'Unknown';
}

function normalizeProductUrl(code: string, upstreamUrl: string | undefined) {
  if (typeof upstreamUrl === 'string' && upstreamUrl.trim().length > 0) {
    return upstreamUrl.trim();
  }

  return `https://world.openfoodfacts.org/product/${code}`;
}

async function lookupBarcodeProductPage(code: string, timeoutMs: number) {
  const productUrl = normalizeProductUrl(code, undefined);
  const { $, html } = await fetchHtmlDocument(productUrl, { timeoutMs });

  const name =
    getElementText($, 'h1[property="food:name"]') ??
    getElementText($, 'h1[itemprop="name"]') ??
    getMetaContent($, 'meta[property="og:title"]');
  const brands =
    $('#field_brands_value')
      .find('[itemprop="brand"], a')
      .toArray()
      .map((element) => $(element).text().trim())
      .filter(Boolean)
      .join(', ') || null;
  const categories = getMetaContent($, 'meta[name="x:data2"]');
  const imageUrl = getMetaContent($, 'meta[property="og:image"]');
  const description = getMetaContent($, 'meta[name="description"]');
  const allergens = $('#panel_allergens_content').text().replace(/\s+/g, ' ').trim() || null;
  const nutriScoreMatch = html.match(/nutriscore-([a-e])-new/i);
  const ecoScoreMatch = html.match(/ecoscore-([a-e])/i);

  if (!name) {
    return null;
  }

  return {
    status: 'found' as const,
    source: 'openfoodfacts_product_page_html' as const,
    code,
    format: detectFormat(code),
    lookupUrl: productUrl,
    statusVerbose: 'product found via product page fallback',
    product: {
      name,
      genericName: null,
      brands,
      categories,
      quantity: null,
      packaging: null,
      countries: null,
      imageUrl,
      productUrl,
      nutriScore: nutriScoreMatch?.[1]?.toLowerCase() ?? null,
      ecoScore: ecoScoreMatch?.[1]?.toLowerCase() ?? null,
      allergens: allergens || description || null
    },
    evidence: {
      publicApiChecked: true,
      productFound: true,
      productPageFallbackUsed: true
    }
  };
}

export async function lookupBarcodeProduct(request: BarcodeLookupRequest) {
  const code = normalizeCode(request.code);
  const lookupUrl = `${OPEN_FOOD_FACTS_BASE_URL}/${encodeURIComponent(code)}.json`;

  const response = await stealthGet(lookupUrl, {
    provider: 'world.openfoodfacts.org',
    timeoutMs: request.timeoutMs,
    retryLimit: 0,
    throwHttpErrors: false
  });

  if (response.statusCode >= 500) {
    throw new UpstreamApiError('OpenFoodFacts public API failed', 502, {
      provider: 'world.openfoodfacts.org',
      statusCode: response.statusCode
    });
  }

  if (response.statusCode === 429) {
    const fallback = await lookupBarcodeProductPage(code, request.timeoutMs);
    if (fallback) {
      return fallback;
    }
  }

  const parsed = safeJsonParse<OpenFoodFactsResponse>(response.body, null);
  if (!parsed) {
    const fallback = await lookupBarcodeProductPage(code, request.timeoutMs);
    if (fallback) {
      return fallback;
    }

    throw new UpstreamApiError('OpenFoodFacts public API returned an empty response', 502, {
      provider: 'world.openfoodfacts.org'
    });
  }

  const format = detectFormat(code);
  const product = parsed.product;

  if (parsed.status !== 1 || !product) {
    return {
      status: 'not_found' as const,
      source: 'openfoodfacts_public_api' as const,
      code,
      format,
      lookupUrl,
      statusVerbose: parsed.status_verbose ?? 'product not found',
    product: null,
    evidence: {
      publicApiChecked: true,
      productFound: false,
      productPageFallbackUsed: false
    }
  };
}

  return {
    status: 'found' as const,
    source: 'openfoodfacts_public_api' as const,
    code,
    format,
    lookupUrl,
    statusVerbose: parsed.status_verbose ?? 'product found',
    product: {
      name: product.product_name ?? null,
      genericName: product.generic_name ?? null,
      brands: product.brands ?? null,
      categories: product.categories ?? null,
      quantity: product.quantity ?? null,
      packaging: product.packaging ?? null,
      countries: product.countries ?? null,
      imageUrl: product.image_front_url ?? product.image_thumb_url ?? null,
      productUrl: normalizeProductUrl(code, product.url),
      nutriScore: product.nutriscore_grade ?? null,
      ecoScore: product.ecoscore_grade ?? null,
      allergens: product.allergens ?? null
    },
    evidence: {
      publicApiChecked: true,
      productFound: true,
      productPageFallbackUsed: false
    }
  };
}
