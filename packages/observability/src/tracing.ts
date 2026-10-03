import { AsyncLocalStorage } from 'async_hooks';

/**
 * W3C TraceContext and OpenTelemetry-compatible tracing interfaces.
 */

export interface SpanContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
  traceState?: string;
}

export type SpanStatusCode = 'UNSET' | 'OK' | 'ERROR';

export interface SpanStatus {
  code: SpanStatusCode;
  message?: string;
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, string | number | boolean | undefined>;
}

export interface ReadableSpan {
  name: string;
  context: SpanContext;
  parentSpanId?: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: SpanStatus;
  attributes: Record<string, string | number | boolean | undefined>;
  events: SpanEvent[];
}

export interface SpanExporter {
  export(spans: ReadableSpan[]): Promise<void> | void;
  shutdown?(): Promise<void> | void;
}

export class InMemorySpanExporter implements SpanExporter {
  private spans: ReadableSpan[] = [];

  export(spans: ReadableSpan[]): void {
    this.spans.push(...spans);
  }

  getFinishedSpans(): ReadableSpan[] {
    return [...this.spans];
  }

  clear(): void {
    this.spans = [];
  }
}

export class ConsoleSpanExporter implements SpanExporter {
  export(spans: ReadableSpan[]): void {
    for (const span of spans) {
      console.log(
        `[TRACE] ${span.name} (traceId=${span.context.traceId}, spanId=${span.context.spanId}, duration=${span.durationMs ?? 0}ms, status=${span.status.code})`
      );
    }
  }
}

/**
 * Converts spans into standard OpenTelemetry Protocol (OTLP) JSON format.
 */
export class OtlpJsonSpanExporter implements SpanExporter {
  private endpoint?: string;
  private headers: Record<string, string>;

  constructor(options: { endpoint?: string; headers?: Record<string, string> } = {}) {
    this.endpoint = options.endpoint;
    this.headers = options.headers ?? {};
  }

  formatOtlpPayload(spans: ReadableSpan[]): Record<string, unknown> {
    return {
      resourceSpans: [
        {
          scopeSpans: [
            {
              spans: spans.map((span) => ({
                traceId: span.context.traceId,
                spanId: span.context.spanId,
                parentSpanId: span.parentSpanId,
                name: span.name,
                kind: 1, // SPAN_KIND_INTERNAL
                startTimeUnixNano: String(span.startTime * 1_000_000),
                endTimeUnixNano: String((span.endTime ?? span.startTime) * 1_000_000),
                attributes: Object.entries(span.attributes).map(([key, val]) => ({
                  key,
                  value:
                    typeof val === 'string'
                      ? { stringValue: val }
                      : typeof val === 'number'
                        ? { doubleValue: val }
                        : { boolValue: Boolean(val) },
                })),
                status: {
                  code: span.status.code === 'OK' ? 1 : span.status.code === 'ERROR' ? 2 : 0,
                  message: span.status.message,
                },
              })),
            },
          ],
        },
      ],
    };
  }

  async export(spans: ReadableSpan[]): Promise<void> {
    if (!this.endpoint) return;

    const payload = this.formatOtlpPayload(spans);
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn(`Failed to export OTLP spans to ${this.endpoint}:`, err);
    }
  }
}

/**
 * Generates a 32-character hex trace ID (16 bytes).
 */
export function generateTraceId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a 16-character hex span ID (8 bytes).
 */
export function generateSpanId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parses W3C traceparent header format: `00-${traceId}-${spanId}-${flags}`
 */
export function parseTraceParent(header: string): SpanContext | undefined {
  const parts = header.trim().split('-');
  if (parts.length < 4) return undefined;
  const [version, traceId, spanId, flags] = parts;
  if (version !== '00' || traceId.length !== 32 || spanId.length !== 16) {
    return undefined;
  }
  return {
    traceId,
    spanId,
    traceFlags: parseInt(flags, 16) || 1,
  };
}

/**
 * Formats SpanContext into W3C traceparent header string.
 */
export function formatTraceParent(context: SpanContext): string {
  const flags = context.traceFlags.toString(16).padStart(2, '0');
  return `00-${context.traceId}-${context.spanId}-${flags}`;
}

export class Span {
  public readonly context: SpanContext;
  public readonly parentSpanId?: string;
  public readonly name: string;
  public readonly startTime: number;
  public endTime?: number;
  public status: SpanStatus = { code: 'UNSET' };
  public attributes: Record<string, string | number | boolean | undefined> = {};
  public events: SpanEvent[] = [];

  constructor(name: string, context: SpanContext, parentSpanId?: string) {
    this.name = name;
    this.context = context;
    this.parentSpanId = parentSpanId;
    this.startTime = Date.now();
  }

  setAttribute(key: string, value: string | number | boolean | undefined): this {
    this.attributes[key] = value;
    return this;
  }

  setAttributes(attrs: Record<string, string | number | boolean | undefined>): this {
    Object.assign(this.attributes, attrs);
    return this;
  }

  addEvent(name: string, attributes?: Record<string, string | number | boolean | undefined>): this {
    this.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
    return this;
  }

  setStatus(code: SpanStatusCode, message?: string): this {
    this.status = { code, message };
    return this;
  }

  end(): ReadableSpan {
    if (!this.endTime) {
      this.endTime = Date.now();
    }
    const durationMs = this.endTime - this.startTime;
    return {
      name: this.name,
      context: this.context,
      parentSpanId: this.parentSpanId,
      startTime: this.startTime,
      endTime: this.endTime,
      durationMs,
      status: this.status,
      attributes: { ...this.attributes },
      events: [...this.events],
    };
  }
}

const activeSpanStorage = new AsyncLocalStorage<Span>();

export class Tracer {
  private exporters: SpanExporter[] = [];

  constructor(exporters: SpanExporter[] = []) {
    this.exporters = exporters;
  }

  addExporter(exporter: SpanExporter): void {
    this.exporters.push(exporter);
  }

  getActiveSpan(): Span | undefined {
    return activeSpanStorage.getStore();
  }

  startSpan(
    name: string,
    options: {
      parentContext?: SpanContext;
      attributes?: Record<string, string | number | boolean | undefined>;
    } = {}
  ): Span {
    const parent = options.parentContext ?? this.getActiveSpan()?.context;
    const traceId = parent?.traceId ?? generateTraceId();
    const parentSpanId = parent?.spanId;
    const spanId = generateSpanId();

    const span = new Span(
      name,
      { traceId, spanId, traceFlags: parent?.traceFlags ?? 1 },
      parentSpanId
    );
    if (options.attributes) {
      span.setAttributes(options.attributes);
    }
    return span;
  }

  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T> | T,
    options: {
      parentContext?: SpanContext;
      attributes?: Record<string, string | number | boolean | undefined>;
    } = {}
  ): Promise<T> {
    const span = this.startSpan(name, options);

    return activeSpanStorage.run(span, async () => {
      try {
        const result = await fn(span);
        if (span.status.code === 'UNSET') {
          span.setStatus('OK');
        }
        return result;
      } catch (error) {
        span.setStatus('ERROR', error instanceof Error ? error.message : String(error));
        throw error;
      } finally {
        const readableSpan = span.end();
        for (const exporter of this.exporters) {
          try {
            await exporter.export([readableSpan]);
          } catch (exportErr) {
            console.warn('Error exporting span:', exportErr);
          }
        }
      }
    });
  }
}

export const defaultTracer = new Tracer();
