import { createLogger, LoggerOptions, type Logger } from './logger.js';
import { MetricsCollector, METRIC_NAMES } from './metrics.js';
import { CorrelationManager } from './correlation.js';

export interface ObservabilityOptions {
  service: string;
  version: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  prettyPrint?: boolean;
}

type RequestLike = {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  route?: { path?: string };
  correlationId?: string;
  logger?: Logger;
  metrics?: MetricsCollector;
  [key: string]: unknown;
};

type ResponseLike = {
  statusCode: number;
  on: (event: string, listener: () => void) => void;
  setHeader?: (name: string, value: string) => void;
  [key: string]: unknown;
};

type NextFunctionLike = (err?: unknown) => void;

export function observabilityMiddleware(options: ObservabilityOptions) {
  const logger = createLogger({
    service: options.service,
    version: options.version,
    level: options.logLevel,
    prettyPrint: options.prettyPrint,
  });

  const metrics = new MetricsCollector();
  const correlation = new CorrelationManager();

  return (req: RequestLike, res: ResponseLike, next: NextFunctionLike) => {
    // Extract or generate correlation ID
    const headers = req.headers as Record<string, string | string[]>;
    const existingContext = correlation.extractHeaders(headers);

    const runWithCorrelation = existingContext
      ? (fn: () => void) => correlation.runWithContext(existingContext, fn)
      : (fn: () => void) => correlation.runWithNew(fn);

    runWithCorrelation(() => {
      const correlationId = correlation.getId();
      // Attach to request
      req.correlationId = correlationId;
      req.logger = logger.child({ correlationId });
      req.metrics = metrics;

      // Propagate headers to response if setHeader is supported
      if (typeof res.setHeader === 'function') {
        const outHeaders = correlation.propagateHeaders();
        for (const [key, value] of Object.entries(outHeaders)) {
          res.setHeader(key, value);
        }
      }

      // Log request
      const startTime = Date.now();
      let completed = false;

      logger.info('Request started', {
        method: req.method,
        path: req.path,
        correlationId,
      });

      const onFinishOrClose = (event: 'finish' | 'close') => {
        if (completed) return;
        completed = true;
        const duration = Date.now() - startTime;
        const status = res.statusCode || (event === 'close' ? 499 : 200);

        logger.info('Request completed', {
          method: req.method,
          path: req.path,
          status,
          duration,
          correlationId,
          event,
        });

        // Track metrics
        metrics.increment(METRIC_NAMES.HTTP_REQUESTS, {
          method: req.method,
          status: status.toString(),
          path: req.route?.path || req.path,
        });

        metrics.observe(METRIC_NAMES.HTTP_DURATION, duration / 1000, {
          method: req.method,
          path: req.route?.path || req.path,
        });
      };

      res.on('finish', () => onFinishOrClose('finish'));
      res.on('close', () => onFinishOrClose('close'));

      try {
        next();
      } catch (err) {
        logger.error('Unhandled synchronous error in request handler', {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          correlationId,
          method: req.method,
          path: req.path,
        });
        metrics.increment(METRIC_NAMES.HTTP_ERRORS, {
          method: req.method,
          path: req.route?.path || req.path,
        });
        throw err;
      }
    });
  };
}

export function observabilityErrorMiddleware(logger: Logger, metrics?: MetricsCollector) {
  return (err: unknown, req: RequestLike, res: ResponseLike, next: NextFunctionLike) => {
    const correlationId = req.correlationId || 'unknown';
    logger.error('Request processing error', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      correlationId,
      method: req.method,
      path: req.path,
    });
    metrics?.increment(METRIC_NAMES.HTTP_ERRORS, {
      method: req.method,
      path: req.route?.path || req.path,
    });
    next(err);
  };
}

export { createLogger, MetricsCollector, CorrelationManager, METRIC_NAMES };
export type { LoggerOptions, Logger };
