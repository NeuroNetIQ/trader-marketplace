import { z } from "zod";

/**
 * Marketplace catalog schemas and types
 */

export const ModelStage = z.enum(["shadow", "pilot", "prod", "retired"]);
export const ModelTask = z.enum(["signal", "consensus", "optimizer"]);
export const DeploymentStatus = z.enum(["pending", "ready", "error", "maintenance", "offline"]);

/**
 * Model in the public catalog
 */
export const CatalogModel = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  vendor: z.string(),
  task: ModelTask,
  stage: ModelStage,
  created_at: z.string(),
  updated_at: z.string(),
  last_heartbeat_at: z.string().nullable(),
  
  // Performance metrics
  last_oos_sharpe: z.number().nullable(),
  avg_confidence: z.number().min(0).max(1).nullable(),
  total_predictions: z.number().int().min(0).optional(),
  
  // Deployment info
  deployment_count: z.number().int().min(0).optional(),
  status: DeploymentStatus.optional(),
  
  // Metadata
  tags: z.array(z.string()).optional(),
  supported_symbols: z.array(z.string()).optional(),
  supported_timeframes: z.array(z.string()).optional(),
});

/**
 * Model version information
 */
export const ModelVersion = z.object({
  id: z.string(),
  model_id: z.string(),
  version: z.string(),
  stage: ModelStage,
  created_at: z.string(),
  performance_metrics: z.record(z.number()).optional(),
  changelog: z.string().optional(),
});

/**
 * Deployment information
 */
export const Deployment = z.object({
  id: z.string(),
  model_id: z.string(),
  version_id: z.string(),
  vendor_id: z.string(),
  status: DeploymentStatus,
  created_at: z.string(),
  last_heartbeat_at: z.string().nullable(),
  
  // Resource info
  cpu_cores: z.number().optional(),
  memory_gb: z.number().optional(),
  gpu_type: z.string().optional(),
  
  // Performance
  avg_latency_ms: z.number().optional(),
  requests_per_minute: z.number().optional(),
  error_rate: z.number().min(0).max(1).optional(),
});

/**
 * Heartbeat from deployment
 */
export const Heartbeat = z.object({
  deployment_id: z.string(),
  status: DeploymentStatus,
  timestamp: z.string(),
  metrics: z.object({
    cpu_usage: z.number().min(0).max(1).optional(),
    memory_usage: z.number().min(0).max(1).optional(),
    avg_latency_ms: z.number().optional(),
    requests_last_minute: z.number().optional(),
    error_count_last_minute: z.number().optional(),
  }).optional(),
  message: z.string().optional(),
});

/**
 * Performance metrics
 */
export const Metric = z.object({
  deployment_id: z.string(),
  metric_type: z.enum(["inference", "performance", "error"]),
  timestamp: z.string(),
  value: z.number(),
  metadata: z.record(z.any()).optional(),
});

// Type exports
export type ModelStage = z.infer<typeof ModelStage>;
export type ModelTask = z.infer<typeof ModelTask>;
export type DeploymentStatus = z.infer<typeof DeploymentStatus>;
export type CatalogModel = z.infer<typeof CatalogModel>;
export type ModelVersion = z.infer<typeof ModelVersion>;
export type Deployment = z.infer<typeof Deployment>;
export type Heartbeat = z.infer<typeof Heartbeat>;
export type Metric = z.infer<typeof Metric>;
