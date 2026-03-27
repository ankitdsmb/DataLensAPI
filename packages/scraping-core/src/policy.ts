import type { ToolExecutionPolicy } from '../../shared-types/src';

export const DEFAULT_TOOL_POLICY: ToolExecutionPolicy = {
  timeoutMs: 10000,
  maxPayloadBytes: 128 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 0
};

export function createToolPolicy(overrides: Partial<ToolExecutionPolicy> = {}): ToolExecutionPolicy {
  return {
    ...DEFAULT_TOOL_POLICY,
    ...overrides
  };
}
