import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const cmsCheckerBulkPolicy = createToolPolicy({
  timeoutMs: 12000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 20,
  anonymous: true,
  cacheTtlSeconds: 300
});

function detectStack(html: string) {
  const lower = html.toLowerCase();
  const stack = new Set<string>();

  if (lower.includes('wp-content') || lower.includes('wordpress')) stack.add('WordPress');
  if (lower.includes('shopify') || lower.includes('cdn.shopify.com')) stack.add('Shopify');
  if (lower.includes('wix.com')) stack.add('Wix');
  if (lower.includes('squarespace')) stack.add('Squarespace');
  if (lower.includes('webflow')) stack.add('Webflow');
  if (lower.includes('joomla')) stack.add('Joomla');
  if (lower.includes('drupal')) stack.add('Drupal');

  return Array.from(stack);
}

export const POST = withScrapingHandler({ policy: cmsCheckerBulkPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, cmsCheckerBulkPolicy);
  const urls = collectUrlInputs(body, cmsCheckerBulkPolicy);

  const results = [];

  for (const url of urls) {
    const { html, $ } = await fetchHtmlDocument(url, { timeoutMs: cmsCheckerBulkPolicy.timeoutMs });
    const generator = $('meta[name="generator"]').attr('content')?.trim() ?? null;
    const cms = detectStack(html);
    if (generator && !cms.includes(generator)) {
      cms.push(generator);
    }

    results.push({ url, generator, cms });
  }

  return { results };
});
