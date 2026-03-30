import {
  collectUrlInputs,
  createToolPolicy,
  optionalIntegerField,
  optionalStringArrayField,
  readJsonBody,
  runLightSiteAudit,
  summarizeSiteAuditPages,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const woorankPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: woorankPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, woorankPolicy);
  requireAllowedFields(body, ['url', 'urls', 'keyword', 'keywords', 'topN']);
  const urls = collectUrlInputs(body, woorankPolicy);

  const pages = await runLightSiteAudit({
    urls,
    keywords: [
      ...(typeof body.keyword === 'string' && body.keyword.trim() ? [body.keyword.trim()] : []),
      ...optionalStringArrayField(body, 'keywords', { maxItems: 50 })
    ],
    topN: optionalIntegerField(body, 'topN', { defaultValue: 20, min: 5, max: 100 }),
    timeoutMs: woorankPolicy.timeoutMs
  });

  return {
    status: 'analyzed',
    mode: 'light_audit',
    pages,
    summary: summarizeSiteAuditPages(pages),
    contract: {
      productLabel: 'Woorank (Compatibility Lite)',
      forensicCategory: 'html-scraper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Runs the shared first-party lightweight SEO audit over the supplied URLs and returns page-level findings plus a site score. This route does not call the official Woorank service.'
    }
  };
});
