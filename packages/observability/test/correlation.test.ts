import { describe, it, expect } from 'vitest';
import { CorrelationManager } from '../src/correlation.js';

describe('CorrelationManager', () => {
  it('manages correlation context within runWithNew', () => {
    const manager = new CorrelationManager();

    expect(manager.getContext()).toBeUndefined();
    expect(manager.getId()).toBeUndefined();

    manager.runWithNew(() => {
      const ctx = manager.getContext();
      expect(ctx).toBeDefined();
      expect(ctx?.correlationId).toBeDefined();
      expect(ctx?.traceId).toHaveLength(32);
      expect(ctx?.spanId).toHaveLength(16);
      expect(manager.getId()).toBe(ctx?.correlationId);
      expect(manager.getTraceId()).toBe(ctx?.traceId);
      expect(manager.getSpanId()).toBe(ctx?.spanId);

      const headers = manager.propagateHeaders();
      expect(headers['X-Correlation-Id']).toBe(ctx?.correlationId);
      expect(headers['X-Trace-Id']).toBe(ctx?.traceId);
      expect(headers['X-Span-Id']).toBe(ctx?.spanId);
      expect(headers['traceparent']).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    });

    expect(manager.getContext()).toBeUndefined();
  });

  it('preserves trace context and generates child span in runWithId', () => {
    const manager = new CorrelationManager();

    manager.runWithNew(() => {
      const parentTraceId = manager.getTraceId();
      const parentSpanId = manager.getSpanId();

      manager.runWithId('custom-corr-123', () => {
        expect(manager.getId()).toBe('custom-corr-123');
        expect(manager.getTraceId()).toBe(parentTraceId);
        // Span ID should be newly generated for sub-context
        expect(manager.getSpanId()).not.toBe(parentSpanId);
      });
    });
  });

  it('extracts W3C traceparent header when present', () => {
    const manager = new CorrelationManager();

    const headers = {
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      tracestate: 'rojo=1,congo=2',
    };

    const ctx = manager.extractHeaders(headers);
    expect(ctx).toBeDefined();
    expect(ctx?.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    expect(ctx?.spanId).toBe('00f067aa0ba902b7');
    expect(ctx?.traceFlags).toBe(1);
    expect(ctx?.traceState).toBe('rojo=1,congo=2');
  });

  it('extracts legacy X-Correlation-Id headers', () => {
    const manager = new CorrelationManager();

    const headers = {
      'x-correlation-id': 'req-98765',
      'x-causation-id': 'cause-123',
    };

    const ctx = manager.extractHeaders(headers);
    expect(ctx).toBeDefined();
    expect(ctx?.correlationId).toBe('req-98765');
    expect(ctx?.causationId).toBe('cause-123');
  });
});
