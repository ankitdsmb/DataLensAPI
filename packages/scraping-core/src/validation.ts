import type { ApiHandlerError, ToolExecutionPolicy } from '../../shared-types/src';
import { DEFAULT_TOOL_POLICY } from './policy';

type IntegerFieldOptions = {
  defaultValue?: number;
  min?: number;
  max?: number;
};

type StringArrayFieldOptions = {
  required?: boolean;
  maxItems?: number;
  fieldLabel?: string;
};

export class RequestValidationError extends Error implements ApiHandlerError {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'RequestValidationError';
    this.code = 'validation_error';
    this.status = 400;
    this.details = details;
  }
}

export async function readJsonBody<T extends Record<string, unknown>>(
  req: Request,
  policy: ToolExecutionPolicy = DEFAULT_TOOL_POLICY
): Promise<T> {
  const contentLengthHeader = req.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > policy.maxPayloadBytes) {
      throw new RequestValidationError('request body exceeds maximum payload size', {
        maxPayloadBytes: policy.maxPayloadBytes,
        contentLength
      });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new RequestValidationError('request body must be valid JSON');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new RequestValidationError('request body must be a JSON object');
  }

  return body as T;
}

export function requireStringField(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new RequestValidationError(`${field} is required`, { field });
  }

  return value.trim();
}

export function optionalBooleanField(
  body: Record<string, unknown>,
  field: string,
  defaultValue = false
): boolean {
  const value = body[field];
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== 'boolean') {
    throw new RequestValidationError(`${field} must be a boolean`, { field });
  }

  return value;
}

export function optionalIntegerField(
  body: Record<string, unknown>,
  field: string,
  options: IntegerFieldOptions = {}
): number {
  const { defaultValue = 0, min, max } = options;
  const value = body[field];

  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new RequestValidationError(`${field} must be an integer`, { field });
  }

  if (min !== undefined && value < min) {
    throw new RequestValidationError(`${field} must be at least ${min}`, { field, min });
  }

  if (max !== undefined && value > max) {
    throw new RequestValidationError(`${field} must be at most ${max}`, { field, max });
  }

  return value;
}

export function optionalStringArrayField(
  body: Record<string, unknown>,
  field: string,
  options: StringArrayFieldOptions = {}
): string[] {
  const { required = false, maxItems, fieldLabel = field } = options;
  const value = body[field];

  if (value === undefined) {
    if (required) {
      throw new RequestValidationError(`${fieldLabel} is required`, { field });
    }

    return [];
  }

  if (!Array.isArray(value)) {
    throw new RequestValidationError(`${fieldLabel} must be an array of strings`, { field });
  }

  const normalized = value.map((item) => {
    if (typeof item !== 'string' || item.trim().length === 0) {
      throw new RequestValidationError(`${fieldLabel} must only contain non-empty strings`, { field });
    }

    return item.trim();
  });

  if (maxItems !== undefined && normalized.length > maxItems) {
    throw new RequestValidationError(`${fieldLabel} exceeds the allowed item limit`, {
      field,
      maxItems
    });
  }

  return normalized;
}

export function collectUrlInputs(
  body: Record<string, unknown>,
  policy: ToolExecutionPolicy
): string[] {
  const singleUrl = typeof body.url === 'string' ? body.url.trim() : '';
  const urls = optionalStringArrayField(body, 'urls', {
    maxItems: policy.maxUrlCount
  });

  const combined = [
    ...(singleUrl ? [singleUrl] : []),
    ...urls
  ];

  if (combined.length === 0) {
    throw new RequestValidationError('url or urls is required', {
      field: 'url',
      alternateField: 'urls'
    });
  }

  if (combined.length > policy.maxUrlCount) {
    throw new RequestValidationError('too many urls requested for this tool', {
      field: 'urls',
      maxUrlCount: policy.maxUrlCount
    });
  }

  const uniqueUrls = Array.from(new Set(combined));
  return uniqueUrls.map(assertHttpUrl);
}

export function assertHttpUrl(value: string): string {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new RequestValidationError('invalid url provided', { value });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new RequestValidationError('url must use http or https', {
      value,
      protocol: parsed.protocol
    });
  }

  return parsed.toString();
}

export function normalizeKeywordInputs(body: Record<string, unknown>): string[] {
  const keywords = optionalStringArrayField(body, 'keywords', { maxItems: 20, fieldLabel: 'keywords' });
  const singleKeyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';
  const combined = [
    ...(singleKeyword ? [singleKeyword] : []),
    ...keywords
  ];

  if (combined.length === 0) {
    throw new RequestValidationError('keyword or keywords is required', {
      field: 'keyword',
      alternateField: 'keywords'
    });
  }

  return Array.from(new Set(combined));
}

export class UpstreamApiError extends Error implements ApiHandlerError {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, status: number = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = 'UpstreamApiError';
    this.code = 'upstream_api_error';
    this.status = status;
    this.details = details;
  }
}

export function safeJsonParse<T = unknown>(jsonString: string | null | undefined, fallback: T | null = null): T | null {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    throw new UpstreamApiError('Failed to parse upstream JSON response', 500, { originalText: jsonString.substring(0, 100) });
  }
}
