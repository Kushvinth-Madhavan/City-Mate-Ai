// API Response type
export interface ApiResponse {
  text: string;
  error?: string;
  details?: string;
  cityPreferences?: string[];
  success?: boolean;
  timestamp?: string;
  sources?: string[];
}

// Query Context type
export interface QueryContext {
  userId: string;
  history: Array<{ role: 'user' | 'assistant', content: string }>;
  cityPreferences: string[];
  sessionId?: string;
  preferences?: {
    budget?: number;
    housingType?: string[];
    jobIndustry?: string[];
}

// Query Processing Options type
export interface QueryProcessingOptions {
  useCache?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  searchResults?: Array<{
    organic_results?: Array<{
      title: string;
      link: string;
      snippet: string;
    }>;
    knowledge_graph?: any;
    answer_box?: any;
    related_searches?: string[];
    pagination?: any;
  }>;
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

// Base interface for API responses with error handling
export interface BaseApiResponse {
  error?: string;
  details?: string | unknown;
}

// API Response Interfaces
export interface CityInfo extends BaseApiResponse {
  city?: any;
  urbanArea?: {
    name: string;
    fullName: string;
    scores: any;
  };
}

export interface HousingMarketData extends BaseApiResponse {
  searchResults?: any[];
  summaries?: Array<{
    title: string;
    source: string;
    summary: string;
    keyPoints: string[];
  }>;
}

export interface JobMarketData extends BaseApiResponse {
  searchResults?: any[];
  summaries?: Array<{
    title: string;
    source: string;
    summary: string;
    keyPoints: string[];
  }>;
}

export interface NewsData extends BaseApiResponse {
  articles?: Array<{
    title: string;
    description: string;
    url: string;
    publishedAt: string;
    source: {
      name: string;
    };
  }>;
  totalResults?: number;
}

export interface NeighborhoodData extends BaseApiResponse {
  features?: Array<{
    properties: {
      name: string;
      description?: string;
      type?: string;
    };
  }>;
  context?: any;
}

export interface CostComparisonData extends BaseApiResponse {
  searchResults?: any[];
  summaries?: Array<{
    title: string;
    source: string;
    summary: string;
    keyPoints: string[];
  }>;
}

export interface CityComparisonData {
  currentCity: {
    name: string;
    info: CityInfo;
    housing: HousingMarketData;
    jobs: JobMarketData;
    news: NewsData;
    neighborhoods: NeighborhoodData;
  };
  targetCity: {
    name: string;
    info: CityInfo;
    housing: HousingMarketData;
    jobs: JobMarketData;
    news: NewsData;
    neighborhoods: NeighborhoodData;
  };
  comparison: CostComparisonData;
}

// Message type
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
  apiUsage?: boolean;
} 