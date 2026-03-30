export type HelperContract = {
  productLabel: string;
  forensicCategory: string;
  implementationDepth: string;
  launchRecommendation: string;
  notes: string;
};

export type ProviderTemplateResponseOptions<T extends Record<string, unknown>> = {
  providerName: string;
  productLabel: string;
  notes: string;
  fields?: T;
};

type HelperResponseOptions<T extends Record<string, unknown>> = {
  status?: string;
  source: string;
  fields: T;
  contract: HelperContract;
};

export function createHelperResponse<T extends Record<string, unknown>>(
  options: HelperResponseOptions<T>
) {
  return {
    status: options.status ?? 'helper_only',
    source: options.source,
    ...options.fields,
    contract: options.contract
  };
}

export function createProviderTemplateResponse<T extends Record<string, unknown>>(
  options: ProviderTemplateResponseOptions<T>
) {
  return {
    status: 'internal_provider_template',
    ...(options.fields ?? ({} as T)),
    provider: {
      name: options.providerName,
      credentialsRequired: true,
      executionState: 'not_executed'
    },
    contract: {
      productLabel: options.productLabel,
      forensicCategory: 'api-key-stub',
      implementationDepth: 'template',
      launchRecommendation: 'internal_only_provider_template',
      notes: options.notes
    }
  };
}

export function normalizeXUsername(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const withoutAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return /^[A-Za-z0-9_]{1,15}$/.test(withoutAt) ? withoutAt.toLowerCase() : null;
}

export function extractXUsernameFromProfileUrl(profileUrl: string | null | undefined) {
  const trimmed = profileUrl?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (hostname !== 'x.com' && hostname !== 'twitter.com') {
      return null;
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
      return null;
    }

    return normalizeXUsername(segments[0]);
  } catch {
    return null;
  }
}
