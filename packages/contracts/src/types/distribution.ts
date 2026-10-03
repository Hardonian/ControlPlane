import { z } from 'zod';

/**
 * Operating distribution mode: open-source standalone ('oss') or managed multi-tenant ('cloud').
 */
export const DistributionModeSchema = z.enum(['oss', 'cloud']);
export type DistributionMode = z.infer<typeof DistributionModeSchema>;

/**
 * Enterprise/Cloud-only feature toggles governed by license and distribution config.
 */
export const CloudFeatureFlagsSchema = z
  .object({
    managedHosting: z.boolean(),
    managedDatabase: z.boolean(),
    dashboard: z.boolean(),
    slaSupport: z.boolean(),
    auditLogs: z.boolean(),
    enterpriseSso: z.boolean(),
    usageAnalytics: z.boolean(),
    multiRegionFailover: z.boolean(),
  })
  .strict();

export type CloudFeatureFlags = z.infer<typeof CloudFeatureFlagsSchema>;

/**
 * Root feature flag container schema.
 */
export const FeatureFlagsSchema = z
  .object({
    cloud: CloudFeatureFlagsSchema,
  })
  .strict();

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

/**
 * Pluggable extension points enabled in this environment.
 */
export const ExtensionPointsSchema = z
  .object({
    runners: z.boolean(),
    connectors: z.boolean(),
    webhooks: z.boolean(),
    marketplace: z.boolean(),
    observabilityExporters: z.boolean(),
  })
  .strict();

export type ExtensionPoints = z.infer<typeof ExtensionPointsSchema>;

/**
 * Authoritative distribution configuration schema verifying OSS and cloud feature boundaries.
 */
export const DistributionConfigSchema = z
  .object({
    mode: DistributionModeSchema,
    featureFlags: FeatureFlagsSchema,
    extensions: ExtensionPointsSchema,
  })
  .strict();

export type DistributionConfig = z.infer<typeof DistributionConfigSchema>;
