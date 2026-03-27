import {
  collectUrlInputs,
  createToolPolicy,
  extractLinks,
  fetchHtmlDocument,
  optionalIntegerField,
  optionalStringArrayField,
  readJsonBody,
  stealthGet,
  withScrapingHandler
} from '@forensic/scraping-core';

const sitemapSuitePolicy = createToolPolicy({
  timeoutMs: 12000,
  maxPayloadBytes: 128 * 1024,
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

function normalizeAction(value: string | undefined) {
  const action = (value ?? 'detect').toLowerCase();
  return action === 'generate' ? 'generate' : 'detect';
}

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
    // Ignore robots failures.
  }

  for (const candidate of Array.from(candidates)) {
    try {
      const response = await stealthGet(candidate, { timeoutMs, throwHttpErrors: false });
      if (response.statusCode && response.statusCode < 400) {
        discovered.push(candidate);
      }
    } catch {
      // Ignore individual candidate failures.
    }
  }

  return Array.from(new Set(discovered));
}

async function generateSitemap(startUrl: string, timeoutMs: number, maxPages: number) {
  const queue = [startUrl];
  const visited = new Set<string>();

  while (queue.length && visited.size < maxPages) {
    const url = queue.shift();
    if (!url || visited.has(url)) {
      continue;
    }

    visited.add(url);
    const { $ } = await fetchHtmlDocument(url, { timeoutMs });
    const links = extractLinks($, url, true)
      .map((link) => link.href)
      .filter((href) => !visited.has(href));

    links.forEach((href) => {
      if (!queue.includes(href) && visited.size + queue.length < maxPages) {
        queue.push(href);
      }
    });
  }

  return Array.from(visited);
}

export const POST = withScrapingHandler({ policy: sitemapSuitePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, sitemapSuitePolicy);
  const action = normalizeAction(typeof body.action === 'string' ? body.action : undefined);
  const urls = collectUrlInputs(body, sitemapSuitePolicy);
  const formats = optionalStringArrayField(body, 'formats', { maxItems: 3 });
  const maxPages = optionalIntegerField(body, 'maxPages', { defaultValue: 50, min: 1, max: 500 });

  const results = [];

  for (const startUrl of urls) {
    if (action === 'detect') {
      const sitemaps = await detectSitemaps(startUrl, sitemapSuitePolicy.timeoutMs);
      results.push({
        startUrl,
        action,
        sitemaps
      });
    } else {
      const pages = await generateSitemap(startUrl, sitemapSuitePolicy.timeoutMs, maxPages);
      results.push({
        startUrl,
        action,
        generated: {
          formats: formats.length ? formats : ['xml', 'html', 'txt'],
          pageCount: pages.length,
          pages
        }
      });
    }
  }

  return {
    action,
    results
  };
});
