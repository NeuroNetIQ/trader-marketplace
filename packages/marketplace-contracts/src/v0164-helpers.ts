/**
 * V0.16.4 compliant signal helpers
 * Prevents 400 VALIDATION_ERROR by ensuring all required fields
 */

import { z } from "zod";
import { Decision, Timeframe } from "./signal.js";

/**
 * V0.16.4 Signal schema (Infrastructure format)
 */
export const V164Signal = z.object({
  owner: z.string().min(1),              // Required: GitHub username or owner identifier
  model_id: z.string().min(1),           // Required: Model identifier
  symbol: z.string().min(1),             // Required: Trading symbol
  timeframe: Timeframe,                  // Required: Timeframe enum
  bar_ts: z.string(),                    // Required: ISO timestamp
  decision: Decision,                    // Required: BUY/SELL/HOLD
  confidence: z.number().min(0).max(1),  // Required: 0.0 to 1.0
  meta: z.record(z.any()).default({}),   // Optional: Additional metadata
});

/**
 * V0.16.4 Consensus schema (Infrastructure format)
 */
export const V164Consensus = z.object({
  owner: z.string().min(1),
  symbol: z.string().min(1),
  timeframe: Timeframe,
  bar_ts: z.string(),
  decision: Decision,
  confidence: z.number().min(0).max(1),
  contributors: z.array(z.object({
    model_id: z.string(),
    decision: Decision,
    weight: z.number().min(0).max(1),
  })),
  meta: z.record(z.any()).default({}),
});

/**
 * Create v0.16.4 compliant signal (prevents 400 errors)
 */
export function makeV164Signal(params: {
  owner: string;
  model_id: string;
  symbol: string;
  timeframe: string;
  decision: string;
  confidence: number;
  bar_ts?: string;
  meta?: Record<string, any>;
}) {
  const signal = {
    owner: params.owner,
    model_id: params.model_id,
    symbol: params.symbol,
    timeframe: params.timeframe,
    bar_ts: params.bar_ts || new Date().toISOString(),
    decision: params.decision,
    confidence: params.confidence,
    meta: params.meta || {},
  };

  // Validate with schema
  const validation = V164Signal.safeParse(signal);
  if (!validation.success) {
    throw new Error(`Invalid v0.16.4 signal: ${validation.error.message}`);
  }

  return validation.data;
}

/**
 * Create v0.16.4 compliant consensus
 */
export function makeV164Consensus(params: {
  owner: string;
  symbol: string;
  timeframe: string;
  decision: string;
  confidence: number;
  contributors: Array<{
    model_id: string;
    decision: string;
    weight: number;
  }>;
  bar_ts?: string;
  meta?: Record<string, any>;
}) {
  const consensus = {
    owner: params.owner,
    symbol: params.symbol,
    timeframe: params.timeframe,
    bar_ts: params.bar_ts || new Date().toISOString(),
    decision: params.decision,
    confidence: params.confidence,
    contributors: params.contributors,
    meta: params.meta || {},
  };

  // Validate with schema
  const validation = V164Consensus.safeParse(consensus);
  if (!validation.success) {
    throw new Error(`Invalid v0.16.4 consensus: ${validation.error.message}`);
  }

  return validation.data;
}

// Type exports
export type V164Signal = z.infer<typeof V164Signal>;
export type V164Consensus = z.infer<typeof V164Consensus>;
