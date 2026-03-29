import {
  analyzeBbbCompanyEvidence,
  createToolPolicy,
  optionalStringArrayField,
  readJsonBody,
  RequestValidationError,
  requireAllowedFields,
  withScrapingHandler
} from '@forensic/scraping-core';

const MAX_COMPANIES = 10;
const CONCURRENCY = 3;

const bulkBbbPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: MAX_COMPANIES,
  anonymous: true,
  cacheTtlSeconds: 120
});

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function runWorker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runWorker()));
  return results;
}

export const POST = withScrapingHandler({ policy: bulkBbbPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, bulkBbbPolicy);
  requireAllowedFields(body, ['companies']);
  const companies = optionalStringArrayField(body, 'companies', { maxItems: MAX_COMPANIES, fieldLabel: 'companies' });

  if (companies.length === 0) {
    throw new RequestValidationError('companies is required', { field: 'companies' });
  }

  const results = await mapWithConcurrency(companies, CONCURRENCY, async (company) => {
    try {
      return await analyzeBbbCompanyEvidence(company, bulkBbbPolicy.timeoutMs);
    } catch (error) {
      return {
        company,
        searchUrl: `https://www.bbb.org/search?find_text=${encodeURIComponent(company)}`,
        status: 'error',
        totalResults: 0,
        results: [],
        bestMatch: null,
        profile: null,
        evidence: {
          searchPageFetched: false,
          searchResultsParsed: false,
          profilePageFetched: false,
          structuredDataParsed: false,
          webDigitalDataParsed: false
        },
        error: error instanceof Error ? error.message : 'bbb_company_analysis_failed'
      };
    }
  });

  const analyzedCount = results.filter((result) => result.status === 'analyzed').length;
  const searchOnlyCount = results.filter((result) => result.status === 'search_results_only').length;
  const errorCount = results.filter((result) => result.status === 'error').length;

  return {
    requestedCount: companies.length,
    analyzedCount,
    searchOnlyCount,
    errorCount,
    results,
    contract: {
      productLabel: 'BBB Company Evidence (Bulk Lite)',
      forensicCategory: 'html-scraper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Fetches public BBB search pages in bulk and enriches the best matched company profile for each input. Requests are capped to 10 companies with bounded concurrency to stay free-tier safe.'
    }
  };
});
