import { z } from "zod";
import { Timeframe } from "./signal.js";

/**
 * Portfolio optimizer schemas and types
 */

export const AssetAllocation = z.object({
  symbol: z.string(),
  weight: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1).optional(),
});

/**
 * Request schema for optimizer inference
 */
export const OptimizerInferenceRequest = z.object({
  portfolio_id: z.string().optional(),
  assets: z.array(z.string()),
  timeframe: Timeframe,
  risk_tolerance: z.number().min(0).max(1).optional(),
  constraints: z.object({
    max_positions: z.number().optional(),
    max_weight_per_asset: z.number().min(0).max(1).optional(),
    min_weight_per_asset: z.number().min(0).max(1).optional(),
    sector_limits: z.record(z.number()).optional(),
  }).optional(),
  market_data: z.record(z.any()).optional(),
});

/**
 * Response schema for optimizer inference
 */
export const OptimizerInferenceResponse = z.object({
  allocations: z.array(AssetAllocation),
  expected_return: z.number().optional(),
  expected_volatility: z.number().optional(),
  sharpe_ratio: z.number().optional(),
  model_version: z.string(),
  timestamp: z.string(),
  rationale: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Schema for writing optimizer results to Infrastructure
 */
export const OptimizerWrite = OptimizerInferenceResponse.extend({
  portfolio_id: z.string().optional(),
  timeframe: Timeframe,
  vendor_id: z.string().optional(),
  deployment_id: z.string().optional(),
});

// Type exports
export type AssetAllocation = z.infer<typeof AssetAllocation>;
export type OptimizerInferenceRequest = z.infer<typeof OptimizerInferenceRequest>;
export type OptimizerInferenceResponse = z.infer<typeof OptimizerInferenceResponse>;
export type OptimizerWrite = z.infer<typeof OptimizerWrite>;
