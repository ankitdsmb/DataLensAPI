import {
  collectUrlInputs,
  createToolPolicy,
  optionalStringArrayField,
  optionalIntegerField,
  readJsonBody,
  requireAllowedFields,
  runLightSiteAudit,
  summarizeSiteAuditPages,
  withScrapingHandler
} from '@forensic/scraping-core';

const siteAuditSuitePolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 160 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: siteAuditSuitePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, siteAuditSuitePolicy);
  requireAllowedFields(body, ['keyword', 'keywords', 'topN', 'url', 'urls']);

  const pages = await runLightSiteAudit({
    urls: collectUrlInputs(body, siteAuditSuitePolicy),
    keywords: [
      ...(typeof body.keyword === 'string' && body.keyword.trim() ? [body.keyword.trim()] : []),
      ...optionalStringArrayField(body, 'keywords', { maxItems: 50 })
    ],
    topN: optionalIntegerField(body, 'topN', { defaultValue: 20, min: 5, max: 100 }),
    timeoutMs: siteAuditSuitePolicy.timeoutMs
  });

  return {
    pages,
    summary: summarizeSiteAuditPages(pages),
    mode: 'single-page-light'
  };
});
