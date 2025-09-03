import { z } from "zod";

/**
 * Training-related schemas and types
 */

export const TrainingTask = z.enum(["signal", "consensus", "optimizer"]);
export type TrainingTask = z.infer<typeof TrainingTask>;

export const BudgetSchema = z.object({
  max_hours: z.number().positive().optional(),
  max_cost_usd: z.number().positive().optional(),
}).default({});

export const WandbSchema = z.object({
  enabled: z.boolean().default(false),
  project: z.string().optional(),
}).default({ enabled: false });

export const TrainingSpecSchema = z.object({
  round_id: z.string().min(1),
  dataset_urls: z.array(z.string().url()).min(1), // signed URLs you mint
  task: TrainingTask,
  hyperparams: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
  // Optional hints
  hf_repo_id: z.string().optional(),       // e.g. "vendor/model-name"
  base_image: z.string().optional(),       // e.g. "nvidia/cuda:12.2.2-runtime-ubuntu22.04"
  output_format: z.enum(["huggingface", "tarball"]).default("huggingface"),
  wandb: WandbSchema.optional(),
  budget: BudgetSchema.optional(),
});

export type TrainingSpec = z.infer<typeof TrainingSpecSchema>;

export const TrainingProvider = z.enum(["runpod", "byoc"]);
export type TrainingProvider = z.infer<typeof TrainingProvider>;

export const TrainingStatus = z.enum(["queued","running","succeeded","failed","cancelled"]);
export type TrainingStatus = z.infer<typeof TrainingStatus>;

export const TrainingRunSchema = z.object({
  run_id: z.string(),
  provider: TrainingProvider,
  status: TrainingStatus,
  created_at: z.string(),        // ISO
  started_at: z.string().optional(),
  finished_at: z.string().optional(),
  logs_url: z.string().url().optional(),
  artifacts: z.object({
    hf_repo: z.string().optional(),     // "vendor/model-name"
    tarball_url: z.string().url().optional(),
    commit: z.string().optional(),
  }).default({}),
  metrics: z.record(z.number()).default({}), // sharpe, win_rate, etc.
});
export type TrainingRun = z.infer<typeof TrainingRunSchema>;

/**
 * Dataset round information
 */
export const DatasetRound = z.object({
  round_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  schema_version: z.string(),
  created_at: z.string(),
  expires_at: z.string().optional(),
  files: z.array(z.object({
    name: z.string(),
    type: z.enum(["train", "validation", "test", "features"]),
    size_bytes: z.number(),
    format: z.string(), // "csv", "parquet", etc.
  })),
  metadata: z.record(z.any()).optional(),
});
export type DatasetRound = z.infer<typeof DatasetRound>;

/**
 * Signed URL response
 */
export const SignedUrlResponse = z.object({
  urls: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    expires_at: z.string(),
  })),
  round_id: z.string(),
  ttl_seconds: z.number(),
});
export type SignedUrlResponse = z.infer<typeof SignedUrlResponse>;

// Optional helper: what we inject into training containers
export type TrainingJobEnv = {
  TRAINING_SPEC: string;     // JSON.stringify(TrainingSpec)
  HF_TOKEN?: string;
  WANDB_API_KEY?: string;
  DATASET_URLS?: string;     // JSON array of signed URLs
  ROUND_ID?: string;
};
