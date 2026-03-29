import { stealthPostForm } from '../httpClient';
import { RequestValidationError, safeJsonParse, UpstreamApiError } from '../validation';

const DEFAULT_LANGUAGE = 'en-US';
const DEFAULT_MATCH_LIMIT = 12;
const MAX_TEXT_LENGTH = 5000;

type LanguageToolMatch = {
  message?: string;
  shortMessage?: string;
  offset?: number;
  length?: number;
  replacements?: Array<{ value?: string }>;
  context?: {
    text?: string;
    offset?: number;
    length?: number;
  };
  rule?: {
    id?: string;
    description?: string;
    issueType?: string;
    category?: {
      id?: string;
      name?: string;
    };
  };
};

type LanguageToolResponse = {
  matches?: LanguageToolMatch[];
  language?: {
    name?: string;
    code?: string;
    detectedLanguage?: {
      name?: string;
      code?: string;
      confidence?: number;
    };
  };
};

export type SpellCheckerRequest = {
  text: string;
  language?: string | null;
  timeoutMs: number;
  maxMatches?: number;
};

function normalizeLanguage(language: string | null | undefined) {
  const normalized = typeof language === 'string' ? language.trim() : '';
  if (!normalized) {
    return DEFAULT_LANGUAGE;
  }

  if (normalized.toLowerCase() === 'auto') {
    return 'auto';
  }

  if (!/^[a-z]{2,3}(?:-[A-Z]{2})?$/i.test(normalized)) {
    throw new RequestValidationError('language must be a valid language code such as en-US or auto', {
      field: 'language'
    });
  }

  if (!normalized.includes('-')) {
    return normalized.toLowerCase();
  }

  const [base, region] = normalized.split('-');
  return `${base.toLowerCase()}-${region.toUpperCase()}`;
}

function normalizeText(text: string) {
  const normalized = text.trim();
  if (!normalized) {
    throw new RequestValidationError('text is required', { field: 'text' });
  }

  if (normalized.length > MAX_TEXT_LENGTH) {
    throw new RequestValidationError(`text exceeds the ${MAX_TEXT_LENGTH} character limit`, {
      field: 'text',
      maxLength: MAX_TEXT_LENGTH
    });
  }

  return normalized;
}

export async function checkSpellingWithLanguageTool(request: SpellCheckerRequest) {
  const text = normalizeText(request.text);
  const language = normalizeLanguage(request.language);
  const maxMatches = request.maxMatches ?? DEFAULT_MATCH_LIMIT;

  const response = await stealthPostForm(
    'https://api.languagetool.org/v2/check',
    {
      text,
      language
    },
    {
      provider: 'api.languagetool.org',
      timeoutMs: request.timeoutMs,
      retryLimit: 0,
      throwHttpErrors: false
    }
  );

  if (response.statusCode >= 500) {
    throw new UpstreamApiError('LanguageTool public API failed', 502, {
      provider: 'api.languagetool.org',
      statusCode: response.statusCode
    });
  }

  const parsed = safeJsonParse<LanguageToolResponse>(response.body, null);
  if (!parsed || !Array.isArray(parsed.matches)) {
    throw new UpstreamApiError('LanguageTool public API returned an unexpected response shape', 502, {
      provider: 'api.languagetool.org'
    });
  }

  const matches = parsed.matches
    .filter((match) => Boolean(match && typeof match === 'object'))
    .slice(0, maxMatches)
    .map((match) => ({
      message: match.message ?? '',
      shortMessage: match.shortMessage ?? '',
      offset: typeof match.offset === 'number' ? match.offset : 0,
      length: typeof match.length === 'number' ? match.length : 0,
      context: {
        text: match.context?.text ?? '',
        offset: typeof match.context?.offset === 'number' ? match.context.offset : 0,
        length: typeof match.context?.length === 'number' ? match.context.length : 0
      },
      replacements: Array.isArray(match.replacements)
        ? match.replacements
            .map((replacement) => (typeof replacement?.value === 'string' ? replacement.value : ''))
            .filter(Boolean)
            .slice(0, 5)
        : [],
      rule: {
        id: match.rule?.id ?? '',
        description: match.rule?.description ?? '',
        issueType: match.rule?.issueType ?? '',
        category: match.rule?.category?.name ?? ''
      }
    }));

  return {
    status: 'analyzed' as const,
    source: 'languagetool_public_api' as const,
    language,
    textLength: text.length,
    matchCount: matches.length,
    totalMatchCount: parsed.matches.length,
    matches,
    truncated: parsed.matches.length > matches.length,
    detectedLanguage: {
      code: parsed.language?.detectedLanguage?.code ?? parsed.language?.code ?? null,
      name: parsed.language?.detectedLanguage?.name ?? parsed.language?.name ?? null,
      confidence:
        typeof parsed.language?.detectedLanguage?.confidence === 'number'
          ? parsed.language.detectedLanguage.confidence
          : null
    },
    evidence: {
      publicApiChecked: true,
      replacementsIncluded: matches.some((match) => match.replacements.length > 0),
      languageDetected: Boolean(parsed.language?.detectedLanguage?.code || parsed.language?.code)
    }
  };
}
