/**
 * HTTP headers and constants for Marketplace API interactions
 */

export const HEADER_CONTRACTS_VERSION = "X-Marketplace-Contracts-Version";
export const HEADER_MARKETPLACE_TOKEN = "X-Marketplace-Token";
export const HEADER_IDEMPOTENCY_KEY = "X-Idempotency-Key";

export const CONTRACTS_SEMVER = "0.2.1";

/**
 * Helper to add standard marketplace headers to requests
 */
export const withMarketplaceHeaders = (headers: Record<string, string> = {}) => ({
  ...headers,
  [HEADER_CONTRACTS_VERSION]: CONTRACTS_SEMVER,
});

/**
 * Helper to add marketplace headers with authorization
 */
export const withMarketplaceAuth = (token: string, headers: Record<string, string> = {}) => ({
  ...withMarketplaceHeaders(headers),
  Authorization: `Bearer ${token}`,
});
