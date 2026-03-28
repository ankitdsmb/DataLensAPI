import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  stealthGet,
  requireAllowedFields
} from '@forensic/scraping-core';

const networkScanPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: networkScanPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, networkScanPolicy);
  requireAllowedFields(body, ['hosts']);
  const hosts = Array.isArray(body.hosts) ? body.hosts : [];
  if (hosts.length === 0) {
    throw new RequestValidationError('hosts is required', { field: 'hosts' });
  }

  const results = [];

  for (const host of hosts) {
    const url = `https://${host}`;
    const response = await stealthGet(url, { timeoutMs: networkScanPolicy.timeoutMs, throwHttpErrors: false });
    results.push({
      host,
      status: response.statusCode ?? null,
      server: response.headers?.server ?? null
    });
  }

  return { results };
});
