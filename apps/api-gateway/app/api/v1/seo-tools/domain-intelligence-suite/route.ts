import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  stealthGet,
  withScrapingHandler
} from '@forensic/scraping-core';

const domainIntelPolicy = createToolPolicy({
  timeoutMs: 12000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

const COMMON_SITEMAP_PATHS = [
  '/sitemap.xml',
  '/sitemap_index.xml',
  '/sitemap-index.xml',
  '/sitemap/sitemap.xml'
];

async function detectSitemaps(baseUrl: string, timeoutMs: number) {
  const base = new URL(baseUrl);
  const candidates = new Set<string>(COMMON_SITEMAP_PATHS.map((path) => new URL(path, base).toString()));
  const discovered: string[] = [];

  try {
    const robotsUrl = new URL('/robots.txt', base).toString();
    const response = await stealthGet(robotsUrl, { timeoutMs, throwHttpErrors: false });
    if (response.statusCode && response.statusCode < 400) {
      const lines = response.body.split('\n');
      lines.forEach((line) => {
        const match = line.match(/Sitemap:\s*(.+)/i);
        if (match?.[1]) {
          candidates.add(match[1].trim());
        }
      });
    }
  } catch {
    // ignore
  }

  for (const candidate of Array.from(candidates)) {
    try {
      const response = await stealthGet(candidate, { timeoutMs, throwHttpErrors: false });
      if (response.statusCode && response.statusCode < 400) {
        discovered.push(candidate);
      }
    } catch {
      // ignore
    }
  }

  return Array.from(new Set(discovered));
}

export const POST = withScrapingHandler({ policy: domainIntelPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, domainIntelPolicy);
  const urls = collectUrlInputs(body, domainIntelPolicy);

  const results = [];

  for (const url of urls) {
    const response = await stealthGet(url, { timeoutMs: domainIntelPolicy.timeoutMs, throwHttpErrors: false });
    const finalUrlRaw = response.redirectUrls?.[response.redirectUrls.length - 1] ?? url;
    const finalUrl = typeof finalUrlRaw === 'string' ? finalUrlRaw : finalUrlRaw.toString();
    const sitemaps = await detectSitemaps(finalUrl, domainIntelPolicy.timeoutMs);

    results.push({
      inputUrl: url,
      finalUrl,
      status: response.statusCode ?? null,
      redirectCount: response.redirectUrls?.length ?? 0,
      server: response.headers?.server ?? null,
      isHttps: finalUrl.startsWith('https://'),
      sitemaps
    });
  }

  return {
    results
  };
});
