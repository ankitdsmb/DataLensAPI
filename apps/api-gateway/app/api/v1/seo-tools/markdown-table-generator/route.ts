import {
  createToolPolicy,
  optionalStringArrayField,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  requireAllowedFields
} from '@forensic/scraping-core';

const markdownTablePolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

function toMarkdownTable(headers: string[], rows: string[][]) {
  const headerLine = `| ${headers.join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.join(' | ')} |`);
  return [headerLine, separator, ...body].join('\n');
}

export const POST = withScrapingHandler({ policy: markdownTablePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, markdownTablePolicy);
  requireAllowedFields(body, ['headers', 'rows']);
  const headers = optionalStringArrayField(body, 'headers', { maxItems: 20, fieldLabel: 'headers' });
  const rows = Array.isArray(body.rows) ? body.rows : [];

  if (headers.length === 0 || rows.length === 0) {
    throw new RequestValidationError('headers and rows are required', { field: 'headers' });
  }

  const normalizedRows = rows.map((row) => {
    if (!Array.isArray(row)) {
      throw new RequestValidationError('rows must be an array of string arrays', { field: 'rows' });
    }
    return row.map((cell) => String(cell));
  });

  return {
    markdown: toMarkdownTable(headers, normalizedRows)
  };
});
