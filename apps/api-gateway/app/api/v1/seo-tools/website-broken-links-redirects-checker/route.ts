import {
  createToolPolicy,
  extractLinks,
  fetchHtmlDocument,
  optionalIntegerField,
  readJsonBody,
  stealthGet,
  collectUrlInputs,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const brokenLinksPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 128 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: brokenLinksPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, brokenLinksPolicy);
  requireAllowedFields(body, ['maxLinks', 'url', 'urls']);
  const urls = collectUrlInputs(body, brokenLinksPolicy);
  const maxLinks = optionalIntegerField(body, 'maxLinks', { defaultValue: 50, min: 5, max: 200 });

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: brokenLinksPolicy.timeoutMs });
    const links = extractLinks($, url, false).map((link) => link.href).slice(0, maxLinks);
    const checks = [];

    for (const link of links) {
      const response = await stealthGet(link, { timeoutMs: brokenLinksPolicy.timeoutMs, throwHttpErrors: false });
      const status = response.statusCode ?? null;
      const redirected = Boolean(response.redirectUrls?.length);
      checks.push({
        url: link,
        status,
        redirected
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

  return {
    results
  };
});
