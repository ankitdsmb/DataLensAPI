import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  stealthGet
,
  safeJsonParse} from '@forensic/scraping-core';

const arcgisPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: arcgisPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, arcgisPolicy);
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  if (!address) {
    throw new RequestValidationError('address is required', { field: 'address' });
  }

  const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=pjson&maxLocations=5&singleLine=${encodeURIComponent(address)}`;
  const response = await stealthGet(url, { timeoutMs: arcgisPolicy.timeoutMs, throwHttpErrors: false });
  const data = response.body ? safeJsonParse<Record<string, unknown>>(response.body) : {};

  return {
    address,
    candidates: ((data as Record<string, unknown>)?.candidates as unknown[]) ?? []
  };
});
