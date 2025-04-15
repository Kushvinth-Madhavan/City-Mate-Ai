import dotenv from 'dotenv';

dotenv.config();

interface APIConfig {
  gemini: {
    apiKey: string;
    model: string;
    maxOutputTokens: number;
    temperature: number;
  };
  retry: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };
  timeout: {
    default: number;
    longRunning: number;
  };
  rateLimit: {
    maxTokens: number;
    refillRate: number;
    refillInterval: number;
  };
  endpoints: {
    baseUrl: string;
    timeout: number;
  };
  headers: {
    'Content-Type': string;
    'Accept': string;
  };
}

export const apiConfig = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-pro',
    maxOutputTokens: 2048,
    temperature: 0.7
  },
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  },
  timeout: {
    default: 30000,
    longRunning: 120000
  },
  rateLimit: {
    maxTokens: 60,
    refillRate: 1,
    refillInterval: 1000,
  },
  endpoints: {
    baseUrl: process.env.API_BASE_URL || 'https://api.example.com',
    timeout: 30000
  },
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
} as const;

// Validate required environment variables
const requiredEnvVars = ['GEMINI_API_KEY'];

export function validateConfig(): void {
  const missingVars = requiredEnvVars.filter(
    envVar => !process.env[envVar]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
}

// Export a function to get API config with validation
export function getAPIConfig(): APIConfig {
  validateConfig();
  return apiConfig;
} 