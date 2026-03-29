export type HelperContract = {
  productLabel: string;
  forensicCategory: string;
  implementationDepth: string;
  launchRecommendation: string;
  notes: string;
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
