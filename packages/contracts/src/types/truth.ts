import { z } from 'zod';
import { ErrorEnvelope } from '../errors/index.js';

/**
 * Permissible primitive or structured values for a TruthCore knowledge triple object.
 */
export const TruthValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.unknown()),
  z.record(z.string(), z.unknown()),
]);
export type TruthValue = z.infer<typeof TruthValue>;

/**
 * Immutable fact or statement asserted into TruthCore with confidence rating and provenance.
 */
export const TruthAssertion = z.object({
  id: z.string().uuid(),
  subject: z.string(),
  predicate: z.string(),
  object: TruthValue,
  confidence: z.number().min(0).max(1).default(1.0),
  timestamp: z.string().datetime(),
  source: z.string(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type TruthAssertion = z.infer<typeof TruthAssertion>;

/**
 * Query pattern and filters for matching knowledge assertions within TruthCore.
 */
export const TruthQuery = z.object({
  id: z.string().uuid(),
  pattern: z.object({
    subject: z.string().optional(),
    predicate: z.string().optional(),
    object: TruthValue.optional(),
  }),
  filters: z
    .object({
      minConfidence: z.number().min(0).max(1).default(0.0),
      sources: z.array(z.string()).optional(),
      before: z.string().datetime().optional(),
      after: z.string().datetime().optional(),
    })
    .prefault({}),
  limit: z.number().int().positive().default(100),
  offset: z.number().int().nonnegative().default(0),
});
export type TruthQuery = z.infer<typeof TruthQuery>;

/**
 * Paginated query results returned by TruthCore containing matched assertions.
 */
export const TruthQueryResult = z.object({
  queryId: z.string().uuid(),
  assertions: z.array(TruthAssertion),
  totalCount: z.number().int().nonnegative(),
  hasMore: z.boolean().default(false),
  queryTimeMs: z.number().nonnegative(),
});
export type TruthQueryResult = z.infer<typeof TruthQueryResult>;

/**
 * Active reactive subscription pattern for receiving newly asserted truths.
 */
export const TruthSubscription = z.object({
  id: z.string().uuid(),
  pattern: z.object({
    subject: z.string().optional(),
    predicate: z.string().optional(),
    object: TruthValue.optional(),
  }),
  filters: z
    .object({
      minConfidence: z.number().min(0).max(1).default(0.0),
    })
    .prefault({}),
  webhookUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
});
export type TruthSubscription = z.infer<typeof TruthSubscription>;

/**
 * Universal RPC request envelope for TruthCore operations.
 */
export const TruthCoreRequest = z.object({
  id: z.string().uuid(),
  type: z.enum(['assert', 'query', 'subscribe', 'unsubscribe']),
  payload: z.record(z.string(), z.unknown()),
  metadata: z.object({
    correlationId: z.string().uuid().optional(),
    source: z.string(),
    timestamp: z.string().datetime(),
  }),
});
export type TruthCoreRequest = z.infer<typeof TruthCoreRequest>;

/**
 * Response envelope returned by TruthCore for knowledge assertions or queries.
 */
export const TruthCoreResponse = z.object({
  requestId: z.string().uuid(),
  success: z.boolean(),
  data: z.unknown().optional(),
  error: ErrorEnvelope.optional(),
  timestamp: z.string().datetime(),
});
export type TruthCoreResponse = z.infer<typeof TruthCoreResponse>;

/**
 * Replication and assertion consistency guarantees supported by TruthCore.
 */
export const ConsistencyLevel = z.enum(['strict', 'eventual', 'best_effort']);
export type ConsistencyLevel = z.infer<typeof ConsistencyLevel>;
