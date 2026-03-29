import {
  createProviderTemplateResponse,
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const rentcastPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: rentcastPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, rentcastPolicy);
  requireAllowedFields(body, ['address']);
  const address = typeof body.address === 'string' ? body.address.trim() : '';

  if (!address) {
    throw new RequestValidationError('address is required', { field: 'address' });
  }

  const lookupUrl = `https://www.rentcast.io/?address=${encodeURIComponent(address)}`;

  return createProviderTemplateResponse({
    providerName: 'RentCast',
    productLabel: 'RentCast Address Lookup Template',
    notes:
      'Generates a normalized lookup URL and returns a provider-template contract only. No RentCast API request is executed until real credentialed provider integration is added.',
    fields: {
      address,
      lookupUrl
    }
  });
});
