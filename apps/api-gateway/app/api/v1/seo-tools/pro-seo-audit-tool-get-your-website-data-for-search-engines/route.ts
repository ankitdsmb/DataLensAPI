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

const proSeoAuditPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 160 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: proSeoAuditPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, proSeoAuditPolicy);
  requireAllowedFields(body, ['keyword', 'keywords', 'topN', 'url', 'urls']);

  const pages = await runLightSiteAudit({
    urls: collectUrlInputs(body, proSeoAuditPolicy),
    keywords: [
      ...(typeof body.keyword === 'string' && body.keyword.trim() ? [body.keyword.trim()] : []),
      ...optionalStringArrayField(body, 'keywords', { maxItems: 50 })
    ],
    topN: optionalIntegerField(body, 'topN', { defaultValue: 20, min: 5, max: 100 }),
    timeoutMs: proSeoAuditPolicy.timeoutMs
  });

  return {
    pages,
    summary: summarizeSiteAuditPages(pages)
  };
});
