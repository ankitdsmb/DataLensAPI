import {
  createToolPolicy,
  optionalStringArrayField,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  stealthGet,
  requireAllowedFields
} from '@forensic/scraping-core';

const tumblrAvailabilityPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 25,
  anonymous: true,
  cacheTtlSeconds: 300
});

function normalizeNames(body: Record<string, unknown>) {
  const names = optionalStringArrayField(body, 'names', { maxItems: 25, fieldLabel: 'names' });
  if (names.length === 0) {
    throw new RequestValidationError('names is required', { field: 'names' });
  }
  return names;
}

export const POST = withScrapingHandler({ policy: tumblrAvailabilityPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, tumblrAvailabilityPolicy);
  requireAllowedFields(body, ['names']);
  const names = normalizeNames(body);

  const results = [];

  for (const name of names) {
    const url = `https://${name}.tumblr.com`;
    const response = await stealthGet(url, { timeoutMs: tumblrAvailabilityPolicy.timeoutMs, throwHttpErrors: false });
    const status = response.statusCode ?? null;
    const available = status === 404;
    results.push({ name, url, status, available });
  }

  return { results };
});
