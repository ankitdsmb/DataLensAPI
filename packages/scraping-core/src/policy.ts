import type { ToolExecutionPolicy } from '../../shared-types/src';

export const DEFAULT_TOOL_POLICY: ToolExecutionPolicy = {
  timeoutMs: 10000,
  maxPayloadBytes: 128 * 1024,
  maxUrlCount: 10,
  maxKeywordCount: 20,
  maxCrawlPages: 50,
  maxBulkItems: 25,
  rateLimitPerMinute: 30,
  maxConcurrentRequests: 2,
  anonymous: true,
  authRequired: false,
  freeTierEligible: true,
  visibility: 'public',
  cacheTtlSeconds: 0
};

export function createToolPolicy(overrides: Partial<ToolExecutionPolicy> = {}): ToolExecutionPolicy {
  return {
    ...DEFAULT_TOOL_POLICY,
    ...overrides
  };
}
