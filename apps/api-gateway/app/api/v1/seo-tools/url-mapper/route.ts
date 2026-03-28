import {
  collectUrlInputs,
  createToolPolicy,
  extractLinks,
  fetchHtmlDocument,
  optionalIntegerField,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const urlMapperPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 3,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: urlMapperPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, urlMapperPolicy);
  requireAllowedFields(body, ['maxPages', 'url', 'urls']);
  const urls = collectUrlInputs(body, urlMapperPolicy);
  const maxPages = optionalIntegerField(body, 'maxPages', { defaultValue: 50, min: 5, max: 300 });

  const results = [];

  for (const startUrl of urls) {
    const queue = [startUrl];
    const visited = new Set<string>();
    const edges: Array<{ from: string; to: string }> = [];

    while (queue.length && visited.size < maxPages) {
      const current = queue.shift();
      if (!current || visited.has(current)) {
        continue;
      }

      visited.add(current);
      const { $ } = await fetchHtmlDocument(current, { timeoutMs: urlMapperPolicy.timeoutMs });
      const links = extractLinks($, current, true).map((link) => link.href);

      links.forEach((link) => {
        edges.push({ from: current, to: link });
        if (!visited.has(link) && queue.length + visited.size < maxPages) {
          queue.push(link);
        }
      });
    }

    results.push({
      startUrl,
      pages: Array.from(visited),
      edges
    });
  }

  return {
    results
  };
});
