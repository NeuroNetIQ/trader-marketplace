import { z } from "zod";

/**
 * Authentication and user management schemas
 * Aligned with @neuronetiq/contracts@0.16.4
 */

/**
 * User profile schema
 */
export const UserProfile = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().optional(),
  avatar_url: z.string().url().optional(),
  role: z.enum(['customer', 'vendor', 'admin']).default('customer'),
  created_at: z.string(),
  updated_at: z.string(),
  
  // GitHub integration (v0.16.4)
  github_username: z.string().optional(),
  github_id: z.string().optional(),
});

/**
 * Vendor profile schema (extends UserProfile)
 */
export const VendorProfile = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  vendor_name: z.string().min(1),
  github_username: z.string().optional(),
  api_key_hash: z.string(),
  api_key_salt: z.string().optional(),
  api_key_created_at: z.string().optional(),
  api_key_last_used: z.string().optional(),
  encrypted_connections: z.record(z.string()).default({}),
  revenue_share: z.number().min(0).max(1).default(0.70),
  status: z.enum(['active', 'suspended', 'pending']).default('active'),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Organization schema for multi-tenant support
 */
export const Organization = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  plan: z.enum(['free', 'pro', 'enterprise']).default('free'),
  created_by: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Organization membership schema
 */
export const Membership = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * API key exchange request (SSO flow)
 */
export const ApiKeyExchangeRequest = z.object({
  auth_code: z.string().min(1),
  cli_version: z.string().optional(),
  user_agent: z.string().optional(),
});

/**
 * API key exchange response
 */
export const ApiKeyExchangeResponse = z.object({
  api_key: z.string(), // Shown only once
  vendor_id: z.string(),
  vendor_name: z.string(),
  expires_at: z.string(),
  permissions: z.array(z.string()).default(['training', 'deployment', 'heartbeats']),
});

/**
 * API key validation request
 */
export const ApiKeyValidateRequest = z.object({
  api_key: z.string().min(1),
});

/**
 * API key validation response
 */
export const ApiKeyValidateResponse = z.object({
  vendor_id: z.string(),
  vendor_name: z.string(),
  github_username: z.string().optional(),
  scoped_token: z.string(),
  permissions: z.array(z.string()),
  expires_at: z.string(),
});

/**
 * API key rotation request
 */
export const ApiKeyRotateRequest = z.object({
  current_api_key: z.string().min(1),
  reason: z.string().optional(),
});

/**
 * API key rotation response
 */
export const ApiKeyRotateResponse = z.object({
  new_api_key: z.string(), // Shown only once
  revoked_at: z.string(),
  expires_at: z.string(),
});

// Type exports
export type UserProfile = z.infer<typeof UserProfile>;
export type VendorProfile = z.infer<typeof VendorProfile>;
export type Organization = z.infer<typeof Organization>;
export type Membership = z.infer<typeof Membership>;
export type ApiKeyExchangeRequest = z.infer<typeof ApiKeyExchangeRequest>;
export type ApiKeyExchangeResponse = z.infer<typeof ApiKeyExchangeResponse>;
export type ApiKeyValidateRequest = z.infer<typeof ApiKeyValidateRequest>;
export type ApiKeyValidateResponse = z.infer<typeof ApiKeyValidateResponse>;
export type ApiKeyRotateRequest = z.infer<typeof ApiKeyRotateRequest>;
export type ApiKeyRotateResponse = z.infer<typeof ApiKeyRotateResponse>;
