import {
  createToolPolicy,
  extractLinks,
  fetchHtmlDocument,
  optionalIntegerField,
  readJsonBody,
  stealthGet,
  collectUrlInputs,
  withScrapingHandler
} from '@forensic/scraping-core';

const brokenLinkPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 128 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: brokenLinkPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, brokenLinkPolicy);
  const urls = collectUrlInputs(body, brokenLinkPolicy);
  const maxLinks = optionalIntegerField(body, 'maxLinks', { defaultValue: 75, min: 5, max: 250 });

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: brokenLinkPolicy.timeoutMs });
    const links = extractLinks($, url, false).map((link) => link.href).slice(0, maxLinks);
    const checks = [];

    for (const link of links) {
      const response = await stealthGet(link, { timeoutMs: brokenLinkPolicy.timeoutMs, throwHttpErrors: false });
      checks.push({
        url: link,
        status: response.statusCode ?? null,
        redirected: Boolean(response.redirectUrls?.length)
      });
    }

    results.push({
      url,
      checkedLinks: checks.length,
      brokenLinks: checks.filter((item) => item.status && item.status >= 400).length,
      redirects: checks.filter((item) => item.redirected).length,
      links: checks
    });
  }

  return { results };
});
