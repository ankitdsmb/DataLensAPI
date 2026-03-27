import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const builtWithPolicy = createToolPolicy({
  timeoutMs: 12000,
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
  if (lower.includes('next.js') || lower.includes('__next')) stack.add('Next.js');
  if (lower.includes('gatsby')) stack.add('Gatsby');
  if (lower.includes('react')) stack.add('React');
  if (lower.includes('angular')) stack.add('Angular');
  if (lower.includes('vue')) stack.add('Vue');
  if (lower.includes('nuxt')) stack.add('Nuxt');

  return Array.from(stack);
}

export const POST = withScrapingHandler({ policy: builtWithPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, builtWithPolicy);
  const urls = collectUrlInputs(body, builtWithPolicy);

  const results = [];

  for (const url of urls) {
    const { html, $ } = await fetchHtmlDocument(url, { timeoutMs: builtWithPolicy.timeoutMs });
    const generator = $('meta[name="generator"]').attr('content')?.trim() ?? null;
    const technologies = detectStack(html);
    if (generator && !technologies.includes(generator)) {
      technologies.push(generator);
    }

    results.push({ url, generator, technologies });
  }

  return { results };
});
