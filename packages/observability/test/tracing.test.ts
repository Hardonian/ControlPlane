import { describe, it, expect, beforeEach } from 'vitest';
import {
  Tracer,
  InMemorySpanExporter,
  generateTraceId,
  generateSpanId,
  parseTraceParent,
  formatTraceParent,
  OtlpJsonSpanExporter,
} from '../src/tracing.js';

describe('Tracing & OpenTelemetry Context', () => {
  it('generates valid 32-char trace IDs and 16-char span IDs', () => {
    const traceId = generateTraceId();
    const spanId = generateSpanId();

    expect(traceId).toHaveLength(32);
    expect(traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(spanId).toHaveLength(16);
    expect(spanId).toMatch(/^[0-9a-f]{16}$/);
  });

  it('formats and parses W3C traceparent headers correctly', () => {
    const context = {
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      spanId: '00f067aa0ba902b7',
      traceFlags: 1,
    };

    const header = formatTraceParent(context);
    expect(header).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');

    const parsed = parseTraceParent(header);
    expect(parsed).toEqual(context);

    // Invalid formats return undefined
    expect(parseTraceParent('invalid')).toBeUndefined();
    expect(parseTraceParent('01-trace-span-01')).toBeUndefined();
    expect(parseTraceParent('00-short-00f067aa0ba902b7-01')).toBeUndefined();
  });

  it('records spans with attributes, events, and status in memory exporter', async () => {
    const exporter = new InMemorySpanExporter();
    const tracer = new Tracer([exporter]);

    const result = await tracer.withSpan('parent-operation', async (parentSpan) => {
      parentSpan.setAttribute('component', 'service-a');
      parentSpan.addEvent('step-1-completed', { items: 5 });

      await tracer.withSpan('child-operation', async (childSpan) => {
        childSpan.setAttribute('query', 'SELECT 1');
        expect(tracer.getActiveSpan()?.name).toBe('child-operation');
      });

      return 42;
    });

    expect(result).toBe(42);

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(2);

    const childSpan = spans[0];
    const parentSpan = spans[1];

    expect(childSpan.name).toBe('child-operation');
    expect(childSpan.context.traceId).toBe(parentSpan.context.traceId);
    expect(childSpan.parentSpanId).toBe(parentSpan.context.spanId);
    expect(childSpan.status.code).toBe('OK');
    expect(childSpan.attributes.query).toBe('SELECT 1');

    expect(parentSpan.name).toBe('parent-operation');
    expect(parentSpan.events).toHaveLength(1);
    expect(parentSpan.events[0].name).toBe('step-1-completed');
    expect(parentSpan.events[0].attributes?.items).toBe(5);
    expect(parentSpan.status.code).toBe('OK');
  });

  it('records error status when an exception is thrown', async () => {
    const exporter = new InMemorySpanExporter();
    const tracer = new Tracer([exporter]);

    await expect(
      tracer.withSpan('failing-operation', async (span) => {
        span.setAttribute('attempt', 1);
        throw new Error('Database connection failed');
      })
    ).rejects.toThrow('Database connection failed');

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].status.code).toBe('ERROR');
    expect(spans[0].status.message).toBe('Database connection failed');
  });

  it('formats spans correctly for OTLP JSON export', () => {
    const otlpExporter = new OtlpJsonSpanExporter();
    const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';
    const spanId = '00f067aa0ba902b7';

    const payload = otlpExporter.formatOtlpPayload([
      {
        name: 'test-span',
        context: { traceId, spanId, traceFlags: 1 },
        startTime: 1000,
        endTime: 1050,
        durationMs: 50,
        status: { code: 'OK' },
        attributes: { 'http.status': 200, 'service.name': 'controlplane' },
        events: [],
      },
    ]);

    expect(payload).toBeDefined();
    const resourceSpans = (payload as any).resourceSpans;
    expect(resourceSpans).toHaveLength(1);
    const spans = resourceSpans[0].scopeSpans[0].spans;
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe('test-span');
    expect(spans[0].traceId).toBe(traceId);
    expect(spans[0].spanId).toBe(spanId);
    expect(spans[0].status.code).toBe(1); // 1 = OK in OTLP
  });
});
