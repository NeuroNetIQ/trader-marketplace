import { z } from "zod";
import { Timeframe, Decision } from "./signal.js";

/**
 * Consensus model schemas and types
 */

/**
 * Request schema for consensus inference
 */
export const ConsensusInferenceRequest = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  timeframe: Timeframe,
  inputs: z.record(z.any()).optional(),
  signals: z.array(z.object({
    decision: Decision,
    confidence: z.number().min(0).max(1),
    source: z.string().optional(),
  })).optional(),
});

/**
 * Response schema for consensus inference
 */
export const ConsensusInferenceResponse = z.object({
  decision: Decision,
  confidence: z.number().min(0).max(1),
  model_version: z.string(),
  timestamp: z.string(),
  rationale: z.array(z.string()).optional(),
  contributions: z.record(z.object({
    decision: Decision,
    weight: z.number(),
    confidence: z.number().optional(),
  })).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Schema for writing consensus to Infrastructure
 */
export const ConsensusWrite = ConsensusInferenceResponse.extend({
  symbol: z.string(),
  timeframe: Timeframe,
  vendor_id: z.string().optional(),
  deployment_id: z.string().optional(),
});

// Type exports
export type ConsensusInferenceRequest = z.infer<typeof ConsensusInferenceRequest>;
export type ConsensusInferenceResponse = z.infer<typeof ConsensusInferenceResponse>;
export type ConsensusWrite = z.infer<typeof ConsensusWrite>;
