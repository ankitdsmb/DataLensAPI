import {
  collectUrlInputs,
  createToolPolicy,
  extractLinks,
  fetchHtmlDocument,
  optionalIntegerField,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const linkGraphPolicy = createToolPolicy({
  timeoutMs: 12000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 3,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: linkGraphPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, linkGraphPolicy);
  const urls = collectUrlInputs(body, linkGraphPolicy);
  const maxPages = optionalIntegerField(body, 'maxPages', { defaultValue: 50, min: 5, max: 300 });

  const results = [];

  for (const startUrl of urls) {
    const queue = [startUrl];
    const visited = new Set<string>();
    const edges: Array<{ source: string; target: string }> = [];

    while (queue.length && visited.size < maxPages) {
      const current = queue.shift();
      if (!current || visited.has(current)) {
        continue;
      }

      visited.add(current);
      const { $ } = await fetchHtmlDocument(current, { timeoutMs: linkGraphPolicy.timeoutMs });
      const links = extractLinks($, current, true).map((link) => link.href);

      links.forEach((link) => {
        edges.push({ source: current, target: link });
        if (!visited.has(link) && queue.length + visited.size < maxPages) {
          queue.push(link);
        }
      });
    }

    results.push({
      startUrl,
      nodes: Array.from(visited),
      edges
    });
  }

  return { results };
});
