/**
 * Utility functions for marketplace operations
 */

/**
 * Generate idempotency key for 5-second slots
 */
export const makeIdempotencyKey = (symbol: string, timeframe: string, ts: Date): string => {
  const slot = Math.floor(ts.getTime() / 5000);
  return `${symbol}:${timeframe}:${slot}`;
};

/**
 * Generate current idempotency key
 */
export const makeCurrentIdempotencyKey = (symbol: string, timeframe: string): string => {
  return makeIdempotencyKey(symbol, timeframe, new Date());
};

/**
 * Generate a random deployment ID
 */
export const generateDeploymentId = (): string => {
  return `dep_${Math.random().toString(36).substring(2, 10)}`;
};

/**
 * Generate a random vendor ID
 */
export const generateVendorId = (): string => {
  return `vendor_${Math.random().toString(36).substring(2, 10)}`;
};

/**
 * Generate a random model ID
 */
export const generateModelId = (): string => {
  return `model_${Math.random().toString(36).substring(2, 10)}`;
};

/**
 * Validate symbol format
 */
export const isValidSymbol = (symbol: string): boolean => {
  return /^[A-Z]{3,6}[A-Z]{3,6}$/.test(symbol) || /^[A-Z]{2,5}$/.test(symbol);
};

/**
 * Parse confidence score to percentage string
 */
export const formatConfidence = (confidence: number): string => {
  return `${(confidence * 100).toFixed(1)}%`;
};

/**
 * Create a timestamp in ISO format
 */
export const createTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Validate timeframe format
 */
export const isValidTimeframe = (timeframe: string): boolean => {
  return ["1m", "5m", "15m", "1h", "4h", "1d"].includes(timeframe);
};
