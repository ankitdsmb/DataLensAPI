import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';

type RequestContext = {
  requestId: string;
  route?: string;
};

type LogLevel = 'info' | 'error';

type LogFields = Record<string, unknown>;
export type TimingHandle = {
  startedAtMs: number;
  monotonicStartMs: number;
};

const requestContextStore = new AsyncLocalStorage<RequestContext>();

export function withRequestContext<T>(context: RequestContext, callback: () => Promise<T>): Promise<T> {
  return requestContextStore.run(context, callback);
}

export function getRequestContext() {
  return requestContextStore.getStore();
}

export function logEvent(level: LogLevel, event: string, fields: LogFields = {}) {
  const context = getRequestContext();
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    request_id: context?.requestId,
    route: context?.route,
    ...fields
  };

  if (level === 'error') {
    console.error(JSON.stringify(payload));
    return;
  }

  console.info(JSON.stringify(payload));
}

export function startTiming(): TimingHandle {
  return {
    startedAtMs: Date.now(),
    monotonicStartMs: performance.now()
  };
}

export function elapsedMs(startTime: TimingHandle | number) {
  if (typeof startTime === 'number') {
    return Math.max(0, Date.now() - startTime);
  }

  return Math.max(0, Math.round(performance.now() - startTime.monotonicStartMs));
}

export function logTiming(event: string, startTime: TimingHandle | number, fields: LogFields = {}) {
  logEvent('info', event, {
    duration_ms: elapsedMs(startTime),
    ...fields
  });
}
