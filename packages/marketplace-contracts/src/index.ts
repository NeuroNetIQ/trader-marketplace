/**
 * @neuronetiq/marketplace-contracts
 * 
 * TypeScript contracts and schemas for the NeuroNetIQ ML Marketplace
 * 
 * This package provides:
 * - Zod schemas for request/response validation
 * - TypeScript types for type safety
 * - Utility functions for common operations
 * - HTTP header constants
 */

// Headers and constants
export * from "./headers.js";

// Signal inference
export * from "./signal.js";

// Consensus inference
export * from "./consensus.js";

// Portfolio optimization
export * from "./optimizer.js";

// Marketplace catalog
export * from "./catalog.js";

// Utility functions
export * from "./utils.js";

// Training and datasets
export * from "./training.js";

// Authentication and user management
export * from "./auth.js";

// V0.16.4 compliance helpers
export * from "./v0164-helpers.js";

// Re-export commonly used Zod for convenience
export { z } from "zod";
