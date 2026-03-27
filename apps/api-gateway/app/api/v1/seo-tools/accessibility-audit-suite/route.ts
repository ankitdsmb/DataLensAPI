import {
  analyzeImageSeoSection,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  collectUrlInputs,
  withScrapingHandler
} from '@forensic/scraping-core';

const accessibilityPolicy = createToolPolicy({
  timeoutMs: 12000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: accessibilityPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, accessibilityPolicy);
  const urls = collectUrlInputs(body, accessibilityPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: accessibilityPolicy.timeoutMs });

    const htmlLang = $('html').attr('lang')?.trim() ?? null;
    const images = analyzeImageSeoSection($, url);

    const inputElements = $('input, select, textarea').toArray();
    let missingLabelCount = 0;

    inputElements.forEach((element) => {
      const id = $(element).attr('id');
      if (!id) {
        missingLabelCount += 1;
        return;
      }
      const label = $(`label[for="${id}"]`);
      if (!label || label.length === 0) {
        missingLabelCount += 1;
      }
    });

    results.push({
      url,
      htmlLang,
      missingLang: htmlLang === null,
      imageAltMissing: images.missingAltCount,
      formControlsWithoutLabels: missingLabelCount
    });
  }

  return {
    results
  };
});
