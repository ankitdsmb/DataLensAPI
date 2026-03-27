import {
  collectUrlInputs,
  createToolPolicy,
  extractLinks,
  fetchHtmlDocument,
  optionalIntegerField,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const sitemapGeneratorPolicy = createToolPolicy({
  timeoutMs: 12000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 3,
  anonymous: true,
  cacheTtlSeconds: 600
});

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

export const POST = withScrapingHandler({ policy: sitemapGeneratorPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, sitemapGeneratorPolicy);
  const urls = collectUrlInputs(body, sitemapGeneratorPolicy);
  const maxPages = optionalIntegerField(body, 'maxPages', { defaultValue: 50, min: 5, max: 500 });

  const results = [];

  for (const startUrl of urls) {
    const pages = await generateSitemap(startUrl, sitemapGeneratorPolicy.timeoutMs, maxPages);
    results.push({
      startUrl,
      pageCount: pages.length,
      pages
    });
  }

  return { results };
});
