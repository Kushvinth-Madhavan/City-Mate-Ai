// API Response type
export interface ApiResponse {
  text: string;
  error?: string;
  details?: string;
  cityPreferences?: string[];
}

// Query Context type
export interface QueryContext {
  userId: string;
  history: Array<{ role: 'user' | 'assistant', content: string }>;
  cityPreferences: string[];
}

// Query Processing Options type
export interface QueryProcessingOptions {
  useCache?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

// User Profile type
export interface UserProfile {
  cityPreferences: Array<{
    city: string;
    timestamp: number;
    confidence: number;
  }>;
  interests: string[];
  lastUpdated: number;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
} 