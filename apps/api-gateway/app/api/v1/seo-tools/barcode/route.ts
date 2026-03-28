import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  requireAllowedFields
} from '@forensic/scraping-core';

const barcodePolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

function detectFormat(code: string) {
  if (code.length === 13) return 'EAN-13';
  if (code.length === 12) return 'UPC-A';
  if (code.length === 10 || code.length === 13) return 'ISBN';
  return 'Unknown';
}

export const POST = withScrapingHandler({ policy: barcodePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, barcodePolicy);
  requireAllowedFields(body, ['code']);
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!code) {
    throw new RequestValidationError('code is required', { field: 'code' });
  }

  return {
    code,
    format: detectFormat(code)
  };
});
