import type { Request, Response, NextFunction } from 'express';
import { createLogger, LoggerOptions } from './logger.js';
import { MetricsCollector, METRIC_NAMES } from './metrics.js';
import { CorrelationManager } from './correlation.js';

export interface ObservabilityOptions {
  service: string;
  version: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  prettyPrint?: boolean;
}

export function observabilityMiddleware(options: ObservabilityOptions) {
  const logger = createLogger({
    service: options.service,
    version: options.version,
    level: options.logLevel,
    prettyPrint: options.prettyPrint,
  });

  const metrics = new MetricsCollector();
  const correlation = new CorrelationManager();

  return (req: Request, res: Response, next: NextFunction) => {
    // Extract or generate correlation ID
    const headers = req.headers as Record<string, string | string[]>;
    const existingContext = correlation.extractHeaders(headers);

    const runWithCorrelation = existingContext
      ? (fn: () => void) => correlation.runWithContext(existingContext, fn)
      : (fn: () => void) => correlation.runWithNew(fn);

    runWithCorrelation(() => {
      // Attach to request
      (req as any).correlationId = correlation.getId();
      (req as any).logger = logger.child({
        correlationId: correlation.getId(),
      });
      (req as any).metrics = metrics;

      // Log request
      const startTime = Date.now();

      logger.info('Request started', {
        method: req.method,
        path: req.path,
        correlationId: correlation.getId(),
      });

      // Capture response
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const status = res.statusCode;

        logger.info('Request completed', {
          method: req.method,
          path: req.path,
          status,
          duration,
          correlationId: correlation.getId(),
        });

        // Track metrics
        metrics.increment('http_requests_total', {
          method: req.method,
          status: status.toString(),
          path: req.route?.path || req.path,
        });

        metrics.observe('http_request_duration_seconds', duration / 1000, {
          method: req.method,
          path: req.route?.path || req.path,
        });
      });

      next();
    });
  };
}

export { createLogger, MetricsCollector, CorrelationManager, METRIC_NAMES };
export type { LoggerOptions };
