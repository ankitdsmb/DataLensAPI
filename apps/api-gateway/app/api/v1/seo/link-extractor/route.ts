import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  optionalBooleanField,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const linkExtractorPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: linkExtractorPolicy }, async (req: Request) => {

    const body = await readJsonBody<Record<string, unknown>>(req, linkExtractorPolicy);
    const url = collectUrlInputs(body, linkExtractorPolicy)[0];
    const internalOnly = optionalBooleanField(body, 'internal_only', false);

    const { $ } = await fetchHtmlDocument(url, { timeoutMs: linkExtractorPolicy.timeoutMs });

    const baseUrl = new URL(url);
    const links: any[] = [];

    $('a').each((_, element) => {
      let href = $(element).attr('href');
      let text = $(element).text().trim();

      if (href && href.length > 0 && !href.startsWith('javascript:')) {
        try {
          // Resolve relative URLs
          const fullUrl = new URL(href, url);

          if (internalOnly && fullUrl.origin !== baseUrl.origin) {
            return; // Skip external links
          }

          links.push({
            href: fullUrl.href,
            text,
            is_internal: fullUrl.origin === baseUrl.origin
          });
        } catch (e) {
          // Invalid URL format
        }
      }
    });

    return {
        target: url,
        total_extracted: links.length,
        links
      };



});
