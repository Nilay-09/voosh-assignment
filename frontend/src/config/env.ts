// Environment configuration for frontend
export const config = {
  // API Configuration
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3003',
  
  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // Timeouts
  apiTimeout: 30000,
  socketTimeout: 10000,
} as const;

export default config;
