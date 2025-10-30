/**
 * API Configuration
 * Centralized API endpoint configuration
 */

export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  wsURL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
  timeout: 10000,
};

// Helper to build API URLs
export const getApiUrl = (path: string): string => {
  return `${API_CONFIG.baseURL}${path}`;
};
