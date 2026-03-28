import {
  assertHttpUrl,
  createToolPolicy,
  readJsonBody,
  stealthGet,
  withScrapingHandler,
  RequestValidationError,
  requireAllowedFields
} from '@forensic/scraping-core';

const apiGatewayPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

function normalizeHeaders(value: unknown) {
  if (!value) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestValidationError('headers must be an object', { field: 'headers' });
  }
  const headers: Record<string, string> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, headerValue]) => {
    if (typeof headerValue === 'string') {
      headers[key] = headerValue;
    }
  });
  return headers;
}

export const POST = withScrapingHandler({ policy: apiGatewayPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, apiGatewayPolicy);
  requireAllowedFields(body, ['headers', 'url']);
  const url = typeof body.url === 'string' ? assertHttpUrl(body.url.trim()) : '';
  if (!url) {
    throw new RequestValidationError('url is required', { field: 'url' });
  }
  const headers = normalizeHeaders(body.headers);

  const response = await stealthGet(url, {
    timeoutMs: apiGatewayPolicy.timeoutMs,
    throwHttpErrors: false,
    headers
  });

  return {
    url,
    status: response.statusCode ?? null,
    headers: response.headers ?? {},
    body: response.body ?? null
  };
});
