import {
  assertHttpUrl,
  createToolPolicy,
  readJsonBody,
  stealthGet,
  withScrapingHandler,
  RequestValidationError
,
  safeJsonParse} from '@forensic/scraping-core';

const apideckPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: apideckPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, apideckPolicy);
  const apiUrl = typeof body.apiUrl === 'string' ? assertHttpUrl(body.apiUrl.trim()) : '';
  if (!apiUrl) {
    throw new RequestValidationError('apiUrl is required', { field: 'apiUrl' });
  }

  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  const appId = typeof body.appId === 'string' ? body.appId.trim() : '';

  const headers: Record<string, string> = {};
  if (apiKey) headers['x-apideck-api-key'] = apiKey;
  if (appId) headers['x-apideck-app-id'] = appId;

  const response = await stealthGet(apiUrl, {
    timeoutMs: apideckPolicy.timeoutMs,
    throwHttpErrors: false,
    headers
  });

  return {
    apiUrl,
    status: response.statusCode ?? null,
    data: response.body ? safeJsonParse<Record<string, unknown>>(response.body) : null
  };
});
