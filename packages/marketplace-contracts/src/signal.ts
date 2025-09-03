import { z } from "zod";

/**
 * Trading signal schemas and types
 */

export const Timeframe = z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]);
export const Decision = z.enum(["BUY", "SELL", "HOLD"]);

/**
 * Request schema for signal inference
 */
export const SignalInferenceRequest = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  timeframe: Timeframe,
  ohlcv: z.array(
    z.tuple([
      z.number(), // timestamp
      z.number(), // open
      z.number(), // high
      z.number(), // low
      z.number(), // close
      z.number(), // volume
    ])
  ).optional(),
  features: z.record(z.number()).optional(),
});

/**
 * Response schema for signal inference
 */
export const SignalInferenceResponse = z.object({
  decision: Decision,
  confidence: z.number().min(0).max(1),
  rationale: z.array(z.string()).optional(),
  model_version: z.string(),
  timestamp: z.string(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Schema for writing signals to Infrastructure
 */
export const SignalWrite = SignalInferenceResponse.extend({
  symbol: z.string(),
  timeframe: Timeframe,
  vendor_id: z.string().optional(),
  deployment_id: z.string().optional(),
});

// Type exports
export type Timeframe = z.infer<typeof Timeframe>;
export type Decision = z.infer<typeof Decision>;
export type SignalInferenceRequest = z.infer<typeof SignalInferenceRequest>;
export type SignalInferenceResponse = z.infer<typeof SignalInferenceResponse>;
export type SignalWrite = z.infer<typeof SignalWrite>;
