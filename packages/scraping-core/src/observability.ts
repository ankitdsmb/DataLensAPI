import { AsyncLocalStorage } from 'node:async_hooks';

type RequestContext = {
  requestId: string;
  route?: string;
};

type LogLevel = 'info' | 'error';

type LogFields = Record<string, unknown>;

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

export function logTiming(event: string, startTime: number, fields: LogFields = {}) {
  logEvent('info', event, {
    duration_ms: Date.now() - startTime,
    ...fields
  });
}
