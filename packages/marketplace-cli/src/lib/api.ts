import fetch from "node-fetch";
import { withMarketplaceHeaders } from "@neuronetiq/marketplace-contracts";
import { loadConfig } from "./config.js";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Make authenticated API request to marketplace
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<ApiResponse<T>> {
  const config = await loadConfig();
  
  if (!config.apiUrl) {
    throw new Error("API URL not configured. Run 'mp login' first.");
  }

  const url = `${config.apiUrl}${endpoint}`;
  const headers: Record<string, string> = withMarketplaceHeaders({
    "Content-Type": "application/json",
    "X-Contracts-Version": "0.17.0",
    ...options.headers,
  });

  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json() as any;
    
    if (!response.ok) {
      return {
        success: false,
        error: data?.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return data as ApiResponse<T>;
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Make request to Infrastructure API
 */
export async function infraRequest<T = any>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<ApiResponse<T>> {
  const config = await loadConfig();
  
  if (!config.infraUrl) {
    throw new Error("Infrastructure URL not configured. Run 'mp link-infra' first.");
  }

  if (!config.infraToken) {
    throw new Error("Infrastructure token not configured. Run 'mp link-infra' first.");
  }

  const url = `${config.infraUrl}${endpoint}`;
  const headers: Record<string, string> = withMarketplaceHeaders({
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.infraToken}`,
    "X-Contracts-Version": "0.17.0",
    ...options.headers,
  });

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json() as any;
    
    if (!response.ok) {
      return {
        success: false,
        error: data?.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return data as ApiResponse<T>;
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
