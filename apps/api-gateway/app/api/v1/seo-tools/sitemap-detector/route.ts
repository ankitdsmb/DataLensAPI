import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  stealthGet,
  withScrapingHandler
} from '@forensic/scraping-core';

const sitemapDetectorPolicy = createToolPolicy({
  timeoutMs: 12000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 600
});

const COMMON_SITEMAP_PATHS = [
  '/sitemap.xml',
  '/sitemap_index.xml',
  '/sitemap-index.xml',
  '/sitemap/sitemap.xml'
];

async function detectSitemaps(startUrl: string, timeoutMs: number) {
  const base = new URL(startUrl);
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

export const POST = withScrapingHandler({ policy: sitemapDetectorPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, sitemapDetectorPolicy);
  const urls = collectUrlInputs(body, sitemapDetectorPolicy);

  const results = [];

  for (const url of urls) {
    const sitemaps = await detectSitemaps(url, sitemapDetectorPolicy.timeoutMs);
    results.push({ url, sitemaps });
  }

  return { results };
});
