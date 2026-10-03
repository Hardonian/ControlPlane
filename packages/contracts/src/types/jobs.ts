import { z } from 'zod';
import { ErrorEnvelope, RetryPolicy } from '../errors/index.js';

/**
 * Unique identifier for a Job (UUID format).
 */
export const JobId = z.string().uuid();
export type JobId = z.infer<typeof JobId>;

/**
 * Execution lifecycle states of a Job.
 */
export const JobStatus = z.enum([
  'pending',
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
  'retrying',
]);
export type JobStatus = z.infer<typeof JobStatus>;

/**
 * Priority value for job scheduling (0-100, default: 50).
 */
export const JobPriority = z.number().int().min(0).max(100).default(50);
export type JobPriority = z.infer<typeof JobPriority>;

/**
 * Contextual provenance and tracing metadata attached to a Job.
 */
export const JobMetadata = z.object({
  source: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  correlationId: z.string().uuid().optional(),
  causationId: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  scheduledAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});
export type JobMetadata = z.infer<typeof JobMetadata>;

/**
 * Payload contents containing type, version, input data, and runner options.
 */
export const JobPayload = z.object({
  type: z.string(),
  version: z.string().default('1.0.0'),
  data: z.record(z.string(), z.unknown()),
  options: z.record(z.string(), z.unknown()).default({}),
});
export type JobPayload = z.infer<typeof JobPayload>;

/**
 * Inbound job submission specification for JobForge and runners.
 */
export const JobRequest = z.object({
  id: JobId,
  type: z.string(),
  priority: JobPriority,
  payload: JobPayload,
  metadata: JobMetadata,
  retryPolicy: RetryPolicy.default({
    maxRetries: 3,
    backoffMs: 1000,
    maxBackoffMs: 30000,
    backoffMultiplier: 2,
    retryableCategories: [],
    nonRetryableCategories: [],
  }),
  timeoutMs: z.number().positive().default(30000),
});
export type JobRequest = z.infer<typeof JobRequest>;

/**
 * Output result payload produced when a Job finishes execution.
 */
export const JobResult = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: ErrorEnvelope.optional(),
  metadata: z.object({
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime(),
    durationMs: z.number().nonnegative(),
    attempts: z.number().int().positive().default(1),
    runnerId: z.string().optional(),
    runnerVersion: z.string().optional(),
  }),
});
export type JobResult = z.infer<typeof JobResult>;

/**
 * Canonical lifecycle state representation returned when querying a Job.
 */
export const JobResponse = z.object({
  id: JobId,
  status: JobStatus,
  request: JobRequest,
  result: JobResult.optional(),
  error: ErrorEnvelope.optional(),
  updatedAt: z.string().datetime(),
});
export type JobResponse = z.infer<typeof JobResponse>;

/**
 * Event types emitted across the Job lifecycle timeline.
 */
export const JobEventType = z.enum([
  'job.created',
  'job.queued',
  'job.started',
  'job.progress',
  'job.completed',
  'job.failed',
  'job.cancelled',
  'job.retrying',
  'job.expired',
]);
export type JobEventType = z.infer<typeof JobEventType>;

/**
 * Structured audit event recording state changes and progress during job execution.
 */
export const JobEvent = z.object({
  id: z.string().uuid(),
  type: JobEventType,
  jobId: JobId,
  timestamp: z.string().datetime(),
  data: z.record(z.string(), z.unknown()).optional(),
  metadata: z.object({
    service: z.string(),
    version: z.string(),
  }),
});
export type JobEvent = z.infer<typeof JobEvent>;

/**
 * Message envelope for queuing jobs across message brokers (e.g. Redis, SQS).
 */
export const QueueMessage = z.object({
  id: z.string().uuid(),
  jobId: JobId,
  payload: JobPayload,
  priority: JobPriority,
  attempts: z.number().int().nonnegative().default(0),
  maxAttempts: z.number().int().positive().default(3),
  createdAt: z.string().datetime(),
  availableAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
});
export type QueueMessage = z.infer<typeof QueueMessage>;
