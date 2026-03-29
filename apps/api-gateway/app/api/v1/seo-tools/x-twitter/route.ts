import {
  createHelperResponse,
  createToolPolicy,
  extractXUsernameFromProfileUrl,
  normalizeXUsername,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const xTwitterPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: xTwitterPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, xTwitterPolicy);
  requireAllowedFields(body, ['query', 'username', 'profileUrl']);
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const profileUrl = typeof body.profileUrl === 'string' ? body.profileUrl.trim() : '';

  if (!query && !username && !profileUrl) {
    throw new RequestValidationError('query or username is required', {
      field: 'query',
      alternateField: 'username'
    });
  }

  const resolvedUsername =
    normalizeXUsername(username) ??
    extractXUsernameFromProfileUrl(profileUrl) ??
    normalizeXUsername(query);
  const searchUrl = query ? `https://x.com/search?q=${encodeURIComponent(query)}` : null;

  if (!resolvedUsername) {
    return createHelperResponse({
      status: 'profile_target_required',
      source: 'x_search_helper',
      fields: {
        query: query || null,
        username: null,
        profileUrl: null,
        searchUrl,
        helperMode: 'profile_lite_only'
      },
      contract: {
        productLabel: 'X Profile Helper (Lite)',
        forensicCategory: 'link-builder',
        implementationDepth: 'helper',
        launchRecommendation: 'public_lite',
        notes:
          'This route only supports profile-lite helper behavior. Provide a username or public profile URL to resolve a normalized X profile target; generic tweet/search extraction is not implemented.'
      }
    });
  }

  return createHelperResponse({
    status: 'profile_lite',
    source: 'x_profile_url',
    fields: {
      query: query || null,
      username: resolvedUsername,
      profileUrl: `https://x.com/${encodeURIComponent(resolvedUsername)}`,
      searchUrl,
      helperMode: 'profile_lite_only'
    },
    contract: {
      productLabel: 'X Profile Helper (Lite)',
      forensicCategory: 'link-builder',
      implementationDepth: 'helper',
      launchRecommendation: 'public_lite',
      notes:
        'Resolves and normalizes public X profile targets only. This route does not scrape tweets, generic search results, follower counts, or engagement data.'
    }
  });
});
