import {
  collectUrlInputs,
  createToolPolicy,
  extractLinks,
  fetchHtmlDocument,
  optionalBooleanField,
  optionalIntegerField,
  readJsonBody,
  stealthGet,
  withScrapingHandler
} from '@forensic/scraping-core';

const linkHealthPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 128 * 1024,
  maxUrlCount: 25,
  anonymous: true,
  cacheTtlSeconds: 300
});

type LinkCheckResult = {
  url: string;
  status: number | null;
  finalUrl: string | null;
  responseTimeMs: number | null;
  redirected: boolean;
  chain: number[];
  error: string | null;
};

async function checkUrl(url: string, timeoutMs: number, followRedirects: boolean): Promise<LinkCheckResult> {
  const startedAt = Date.now();

  try {
    const response = await stealthGet(url, {
      timeoutMs,
      throwHttpErrors: false,
      followRedirect: followRedirects
    });

    const responseTimeMs = Date.now() - startedAt;
    const status = response.statusCode ?? null;
    const redirected = Boolean(response.redirectUrls?.length);
    const chain = redirected ? response.redirectUrls.map(() => 302) : [];
    const finalUrlRaw = redirected
      ? response.redirectUrls[response.redirectUrls.length - 1]
      : url;
    const finalUrl = typeof finalUrlRaw === 'string' ? finalUrlRaw : finalUrlRaw?.toString() ?? null;

    return {
      url,
      status,
      finalUrl,
      responseTimeMs,
      redirected,
      chain,
      error: null
    };
  } catch (error: any) {
    return {
      url,
      status: null,
      finalUrl: null,
      responseTimeMs: Date.now() - startedAt,
      redirected: false,
      chain: [],
      error: error?.message ?? 'request_failed'
    };
  }
}

export const POST = withScrapingHandler({ policy: linkHealthPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, linkHealthPolicy);
  const crawl = optionalBooleanField(body, 'crawl', false);
  const followRedirects = optionalBooleanField(body, 'followRedirects', true);
  const timeoutMs = optionalIntegerField(body, 'timeoutMs', { defaultValue: linkHealthPolicy.timeoutMs, min: 1000, max: 20000 });
  const maxLinks = optionalIntegerField(body, 'maxLinks', { defaultValue: 50, min: 1, max: 200 });

  let urls = collectUrlInputs(body, linkHealthPolicy);

  if (crawl) {
    const seedUrl = urls[0];
    const { $ } = await fetchHtmlDocument(seedUrl, { timeoutMs });
    const extractedLinks = extractLinks($, seedUrl, false)
      .map((link) => link.href)
      .slice(0, maxLinks);
    urls = Array.from(new Set([seedUrl, ...extractedLinks])).slice(0, linkHealthPolicy.maxUrlCount);
  }

  const results = [];
  for (const url of urls) {
    results.push(await checkUrl(url, timeoutMs, followRedirects));
  }

  const summary = {
    total: results.length,
    broken: results.filter((item) => item.status && item.status >= 400).length,
    redirects: results.filter((item) => item.redirected).length,
    errors: results.filter((item) => item.error).length
  };

  return {
    results,
    summary
  };
});
