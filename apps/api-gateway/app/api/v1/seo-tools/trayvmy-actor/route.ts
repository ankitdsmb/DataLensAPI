import {
  createHelperResponse,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const trayvmyPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 32 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: trayvmyPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, trayvmyPolicy);
  requireAllowedFields(body, []);

  return createHelperResponse({
    status: 'internal_deprecated_template',
    source: 'compatibility_placeholder',
    fields: {
      deprecated: true,
      compatibilityOnly: true,
      replacement: null
    },
    contract: {
      productLabel: 'trayv/my-actor (Deprecated Internal Template)',
      forensicCategory: 'shallow-local-utility',
      implementationDepth: 'template',
      launchRecommendation: 'internal_only_deprecated',
      notes:
        'Retained only for route compatibility. This route performs no automation, submits no jobs, and is quarantined from public launch.'
    }
  });
});
