import { z } from 'zod';
import { ContractVersion } from '../versioning/index.js';
import { ErrorEnvelope } from '../errors/index.js';

/**
 * Functional capability exposed by a Runner, specifying input/output schemas and resource constraints.
 */
export const RunnerCapability = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  inputSchema: z.record(z.string(), z.unknown()),
  outputSchema: z.record(z.string(), z.unknown()),
  supportedJobTypes: z.array(z.string()),
  maxConcurrency: z.number().int().positive().default(1),
  timeoutMs: z.number().positive().default(30000),
  resourceRequirements: z
    .object({
      cpu: z.string().optional(),
      memory: z.string().optional(),
      gpu: z.boolean().default(false),
    })
    .prefault({}),
});
export type RunnerCapability = z.infer<typeof RunnerCapability>;

/**
 * Active registration record and health status of a connected Runner.
 */
export const RunnerMetadata = z.object({
  id: z.string().uuid(),
  name: z.string(),
  version: z.string(),
  contractVersion: ContractVersion,
  capabilities: z.array(RunnerCapability),
  supportedContracts: z.array(z.string()),
  healthCheckEndpoint: z.string().url(),
  registeredAt: z.string().datetime(),
  lastHeartbeatAt: z.string().datetime(),
  status: z.enum(['healthy', 'degraded', 'unhealthy', 'offline']).default('healthy'),
  tags: z.array(z.string()).default([]),
});
export type RunnerMetadata = z.infer<typeof RunnerMetadata>;

/**
 * Handshake payload sent by a Runner when joining the ControlPlane cluster.
 */
export const RunnerRegistrationRequest = z.object({
  name: z.string(),
  version: z.string(),
  contractVersion: ContractVersion,
  capabilities: z.array(RunnerCapability),
  healthCheckEndpoint: z.string().url(),
  tags: z.array(z.string()).default([]),
});
export type RunnerRegistrationRequest = z.infer<typeof RunnerRegistrationRequest>;

/**
 * Acknowledgement returned to a Runner upon successful registration.
 */
export const RunnerRegistrationResponse = z.object({
  runnerId: z.string().uuid(),
  registeredAt: z.string().datetime(),
  heartbeatIntervalMs: z.number().positive().default(30000),
});
export type RunnerRegistrationResponse = z.infer<typeof RunnerRegistrationResponse>;

/**
 * Periodic liveness ping and workload metrics emitted by active Runners.
 */
export const RunnerHeartbeat = z.object({
  runnerId: z.string().uuid(),
  timestamp: z.string().datetime(),
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  activeJobs: z.number().int().nonnegative().default(0),
  queuedJobs: z.number().int().nonnegative().default(0),
  metrics: z
    .object({
      cpuUsage: z.number().min(0).max(100).optional(),
      memoryUsage: z.number().min(0).max(100).optional(),
      jobThroughput: z.number().nonnegative().optional(),
    })
    .default({}),
});
export type RunnerHeartbeat = z.infer<typeof RunnerHeartbeat>;

/**
 * Declarative package manifest describing an executable module and its capabilities.
 */
export const ModuleManifest = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  entryPoint: z.string(),
  contractVersion: ContractVersion,
  capabilities: z.array(RunnerCapability),
  dependencies: z.array(z.string()).default([]),
  configSchema: z.record(z.string(), z.unknown()).optional(),
  defaultConfig: z.record(z.string(), z.unknown()).default({}),
});
export type ModuleManifest = z.infer<typeof ModuleManifest>;

/**
 * Dispatch envelope instructing a runner to execute a specific capability for a job.
 */
export const RunnerExecutionRequest = z.object({
  jobId: z.string().uuid(),
  moduleId: z.string(),
  capabilityId: z.string(),
  payload: z.record(z.string(), z.unknown()),
  timeoutMs: z.number().positive().default(30000),
  metadata: z
    .object({
      correlationId: z.string().uuid().optional(),
      userId: z.string().optional(),
    })
    .default({}),
});
export type RunnerExecutionRequest = z.infer<typeof RunnerExecutionRequest>;

/**
 * Execution completion report emitted by a Runner back to JobForge.
 */
export const RunnerExecutionResponse = z.object({
  jobId: z.string().uuid(),
  success: z.boolean(),
  data: z.unknown().optional(),
  error: ErrorEnvelope.optional(),
  executionTimeMs: z.number().nonnegative(),
  runnerId: z.string().uuid(),
});
export type RunnerExecutionResponse = z.infer<typeof RunnerExecutionResponse>;
