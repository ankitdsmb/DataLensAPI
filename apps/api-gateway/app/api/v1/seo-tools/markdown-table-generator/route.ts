import {
  buildMarkdownTable,
  createToolPolicy,
  optionalBooleanField,
  optionalStringArrayField,
  optionalStringField,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const markdownTablePolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: markdownTablePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, markdownTablePolicy);
  requireAllowedFields(body, ['alignments', 'delimiter', 'hasHeaderRow', 'headers', 'input', 'rows']);
  const headers = optionalStringArrayField(body, 'headers', { maxItems: 20, fieldLabel: 'headers' });
  const rows = Array.isArray(body.rows) ? body.rows : [];

  const normalizedRows = rows.map((row) => {
    return Array.isArray(row) ? row.map((cell) => String(cell)) : [String(row)];
  });

  const table = buildMarkdownTable({
    headers,
    rows: normalizedRows,
    input: optionalStringField(body, 'input', '') || null,
    delimiter: optionalStringField(body, 'delimiter', '') || null,
    hasHeaderRow: optionalBooleanField(body, 'hasHeaderRow', true),
    alignments: optionalStringArrayField(body, 'alignments', { maxItems: 20, fieldLabel: 'alignments' })
  });

  return {
    ...table,
    contract: {
      productLabel: 'Markdown Table Generator',
      forensicCategory: 'local-utility',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Generates markdown tables from explicit rows or parsed CSV/TSV-style input, with column alignment, markdown escaping, and ragged-row normalization. This is a deterministic formatting utility, not a spreadsheet engine.'
    }
  };
});
