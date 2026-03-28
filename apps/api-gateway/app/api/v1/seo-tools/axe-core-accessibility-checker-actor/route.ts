import {
  analyzeImageSeoSection,
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const axeCorePolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: axeCorePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, axeCorePolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, axeCorePolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: axeCorePolicy.timeoutMs });
    const images = analyzeImageSeoSection($, url);
    const missingLang = !$('html').attr('lang');
    const formControls = $('input, select, textarea').toArray();
    let missingLabelCount = 0;
    formControls.forEach((element) => {
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
      missingLang,
      missingAltCount: images.missingAltCount,
      formControlsWithoutLabels: missingLabelCount
    });
  }

  return { results };
});
