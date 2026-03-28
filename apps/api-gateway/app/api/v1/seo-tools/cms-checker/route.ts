import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const cmsCheckerPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
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

export const POST = withScrapingHandler({ policy: cmsCheckerPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, cmsCheckerPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, cmsCheckerPolicy);

  const results = [];

  for (const url of urls) {
    const { html, $ } = await fetchHtmlDocument(url, { timeoutMs: cmsCheckerPolicy.timeoutMs });
    const generator = $('meta[name="generator"]').attr('content')?.trim() ?? null;
    const technologies = detectStack(html);
    if (generator && !technologies.includes(generator)) {
      technologies.push(generator);
    }

    results.push({ url, generator, cms: technologies });
  }

  return { results };
});
