import { RequestValidationError } from '../validation';

type Alignment = 'left' | 'center' | 'right';

export type MarkdownTableRequest = {
  headers?: string[];
  rows?: string[][];
  input?: string | null;
  delimiter?: string | null;
  hasHeaderRow?: boolean;
  alignments?: string[];
};

function escapeMarkdownCell(value: string) {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function normalizeDelimiter(input: string | null | undefined, sample: string) {
  if (input === '\\t') return '\t';
  if (input === ',' || input === ';' || input === '\t' || input === '|') return input;
  if (sample.includes('\t')) return '\t';
  if (sample.includes(';')) return ';';
  if (sample.includes('|')) return '|';
  return ',';
}

function parseDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
        continue;
      }

      insideQuotes = !insideQuotes;
      continue;
    }

    if (!insideQuotes && character === delimiter) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
}

function parseDelimitedInput(input: string, delimiter: string) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  return lines.map((line) => parseDelimitedLine(line, delimiter));
}

function normalizeAlignment(value: string | undefined): Alignment {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === 'left') return 'left';
  if (normalized === 'center') return 'center';
  if (normalized === 'right') return 'right';

  throw new RequestValidationError('alignments must only contain left, center, or right', {
    field: 'alignments'
  });
}

function alignmentSeparator(alignment: Alignment) {
  if (alignment === 'center') return ':---:';
  if (alignment === 'right') return '---:';
  return '---';
}

function normalizeRows(rows: string[][], columnCount: number) {
  return rows.map((row) => {
    const normalized = row.map((cell) => escapeMarkdownCell(String(cell).trim()));
    while (normalized.length < columnCount) {
      normalized.push('');
    }
    return normalized.slice(0, columnCount);
  });
}

export function buildMarkdownTable(request: MarkdownTableRequest) {
  const explicitHeaders = request.headers?.map((header) => header.trim()).filter((header) => header.length > 0) ?? [];
  const explicitRows = request.rows ?? [];
  const input = request.input?.trim() ?? '';

  let headers = explicitHeaders;
  let rows = explicitRows.map((row) => row.map((cell) => String(cell)));
  let delimiterUsed: string | null = null;

  if (input) {
    delimiterUsed = normalizeDelimiter(request.delimiter ?? null, input);
    const parsedRows = parseDelimitedInput(input, delimiterUsed);
    if (parsedRows.length === 0) {
      throw new RequestValidationError('input must contain at least one non-empty row', { field: 'input' });
    }

    const hasHeaderRow = request.hasHeaderRow !== false;
    if (hasHeaderRow) {
      headers = parsedRows[0].map((cell) => cell.trim());
      rows = parsedRows.slice(1).map((row) => row.map((cell) => cell.trim()));
    } else {
      rows = parsedRows.map((row) => row.map((cell) => cell.trim()));
      headers = headers.length > 0
        ? headers
        : Array.from({ length: Math.max(...parsedRows.map((row) => row.length), 0) }, (_, index) => `Column ${index + 1}`);
    }
  }

  if (headers.length === 0 || rows.length === 0) {
    throw new RequestValidationError('headers and rows are required, or provide input with at least one data row', {
      field: 'headers',
      alternateField: 'input'
    });
  }

  const columnCount = Math.max(headers.length, ...rows.map((row) => row.length));
  const normalizedHeaders = [...headers];
  while (normalizedHeaders.length < columnCount) {
    normalizedHeaders.push(`Column ${normalizedHeaders.length + 1}`);
  }

  const alignments = Array.from({ length: columnCount }, (_, index) =>
    normalizeAlignment(request.alignments?.[index])
  );

  const escapedHeaders = normalizedHeaders.map((header) => escapeMarkdownCell(header));
  const normalizedRows = normalizeRows(rows, columnCount);
  const markdownLines = [
    `| ${escapedHeaders.join(' | ')} |`,
    `| ${alignments.map((alignment) => alignmentSeparator(alignment)).join(' | ')} |`,
    ...normalizedRows.map((row) => `| ${row.join(' | ')} |`)
  ];

  return {
    status: 'generated' as const,
    markdown: markdownLines.join('\n'),
    headers: normalizedHeaders,
    rowCount: normalizedRows.length,
    columnCount,
    delimiterUsed,
    alignments,
    evidence: {
      parsedDelimitedInput: Boolean(input),
      normalizedRaggedRows: rows.some((row) => row.length !== columnCount),
      escapedMarkdownCells:
        escapedHeaders.some((header, index) => header !== normalizedHeaders[index]) ||
        normalizedRows.some((row) => row.some((cell) => /\\\||<br>/.test(cell)))
    }
  };
}
