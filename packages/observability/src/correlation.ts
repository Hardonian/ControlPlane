import { AsyncLocalStorage } from 'async_hooks';
import { generateTraceId, generateSpanId, parseTraceParent, formatTraceParent } from './tracing.js';

export interface CorrelationContext {
  correlationId: string;
  causationId?: string;
  traceId?: string;
  spanId?: string;
  traceFlags?: number;
  traceState?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<CorrelationContext>();

export function generateId(): string {
  return crypto.randomUUID();
}

export class CorrelationManager {
  getContext(): CorrelationContext | undefined {
    return asyncLocalStorage.getStore();
  }

  getId(): string | undefined {
    return this.getContext()?.correlationId;
  }

  getTraceId(): string | undefined {
    return this.getContext()?.traceId;
  }

  getSpanId(): string | undefined {
    return this.getContext()?.spanId;
  }

  runWithNew<T>(fn: () => T): T {
    const traceId = generateTraceId();
    const spanId = generateSpanId();
    const context: CorrelationContext = {
      correlationId: generateId(),
      traceId,
      spanId,
      traceFlags: 1,
    };

    return asyncLocalStorage.run(context, fn);
  }

  runWithId<T>(correlationId: string, fn: () => T): T {
    const parentContext = this.getContext();
    const traceId = parentContext?.traceId || generateTraceId();
    const spanId = generateSpanId();
    const context: CorrelationContext = {
      correlationId,
      traceId,
      spanId,
      traceFlags: parentContext?.traceFlags ?? 1,
      traceState: parentContext?.traceState,
    };

    return asyncLocalStorage.run(context, fn);
  }

  runWithContext<T>(context: CorrelationContext, fn: () => T): T {
    return asyncLocalStorage.run(context, fn);
  }

  propagateHeaders(): Record<string, string> {
    const context = this.getContext();
    if (!context) {
      return {};
    }

    const headers: Record<string, string> = {
      'X-Correlation-Id': context.correlationId,
    };

    if (context.causationId) {
      headers['X-Causation-Id'] = context.causationId;
    }

    if (context.traceId) {
      headers['X-Trace-Id'] = context.traceId;
    }

    if (context.spanId) {
      headers['X-Span-Id'] = context.spanId;
    }

    if (
      context.traceId &&
      context.spanId &&
      context.traceId.length === 32 &&
      context.spanId.length === 16
    ) {
      headers['traceparent'] = formatTraceParent({
        traceId: context.traceId,
        spanId: context.spanId,
        traceFlags: context.traceFlags ?? 1,
        traceState: context.traceState,
      });
    }

    if (context.traceState) {
      headers['tracestate'] = context.traceState;
    }

    return headers;
  }

  extractHeaders(
    headers: Record<string, string | string[] | undefined>
  ): CorrelationContext | undefined {
    const getHeader = (name: string): string | undefined => {
      const value = headers[name.toLowerCase()] || headers[name];
      return Array.isArray(value) ? value[0] : value;
    };

    const correlationId = getHeader('X-Correlation-Id') || getHeader('x-correlation-id');
    const traceparent = getHeader('traceparent');
    const tracestate = getHeader('tracestate');

    let traceId = getHeader('X-Trace-Id') || getHeader('x-trace-id');
    let spanId = getHeader('X-Span-Id') || getHeader('x-span-id');
    let traceFlags: number | undefined;

    if (traceparent) {
      const parsed = parseTraceParent(traceparent);
      if (parsed) {
        traceId = parsed.traceId;
        spanId = parsed.spanId;
        traceFlags = parsed.traceFlags;
      }
    }

    if (!correlationId && !traceparent && !traceId) {
      return undefined;
    }

    return {
      correlationId: correlationId || traceId || generateId(),
      causationId: getHeader('X-Causation-Id') || getHeader('x-causation-id'),
      traceId,
      spanId,
      traceFlags,
      traceState: tracestate,
    };
  }
}

// Singleton instance for convenience
export const correlation = new CorrelationManager();
