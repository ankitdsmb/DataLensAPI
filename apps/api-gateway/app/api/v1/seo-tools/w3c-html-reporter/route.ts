import {
  analyzeHeadingsSection,
  analyzeMetaTagsSection,
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const htmlReporterPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: htmlReporterPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, htmlReporterPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, htmlReporterPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: htmlReporterPolicy.timeoutMs });
    const meta = analyzeMetaTagsSection($, url);
    const headings = analyzeHeadingsSection($);
    const htmlLang = $('html').attr('lang')?.trim() ?? null;
    const issues = [...meta.issues, ...headings.issues];

    if (!htmlLang) {
      issues.push({
        code: 'missing_html_lang',
        severity: 'medium',
        category: 'technical',
        message: 'HTML tag is missing a lang attribute.'
      });
    }

    results.push({
      url,
      htmlLang,
      issues
    });
  }

  return { results };
});
