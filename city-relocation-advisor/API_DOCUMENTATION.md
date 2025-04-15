# City Relocation Advisor API Architecture

## Table of Contents
- [Overview](#overview)
- [Core APIs](#core-apis)
- [Parallel Execution System](#parallel-execution-system)
- [API Integration Flow](#api-integration-flow)
- [Error Handling](#error-handling)
- [Type System](#type-system)
- [Usage Examples](#usage-examples)

## Overview

The City Relocation Advisor uses a sophisticated multi-API architecture with parallel execution capabilities to gather and analyze data about cities for relocation purposes.

### API Usage Report
```plaintext
API Usage Report:
   - Google Gemini AI: ✅ Used (Primary LLM for response generation)
   - SerpAPI (Google Search): ✅ Used (Web search and data enrichment)
   - Parallel Execution: ✅ Used (Concurrent API calls)
   - Teleport API: ✅ Used (City information and scores)
   - News API: ✅ Used (City-specific news)
   - Radar API: ✅ Used (Neighborhood data)
   - Jina Reader: ✅ Used (Web content summarization)
```

## Core APIs

### 1. SerpAPI Integration
```typescript
export async function searchGoogle(query: string) {
  // Performs Google searches with structured results
  return {
    organic_results: [],
    knowledge_graph: {},
    answer_box: {},
    related_searches: []
  };
}
```

**Use Cases:**
- Housing market research
- Job market analysis
- Cost of living comparisons
- School district information
- Public transportation details

### 2. Parallel Execution System
```typescript
export async function executeInParallel<T>(
  functions: Array<() => Promise<T>>,
  options: {
    maxConcurrent?: number;
    timeout?: number;
  } = {}
): Promise<Array<T>>
```

**Features:**
- Configurable concurrency (default: 3)
- Timeout handling
- Error isolation
- Batch processing

## API Integration Flow

### Request Flow Diagram
```plaintext
User Query
    ↓
APIOrchestrator
    ↓
Parallel Execution Layer
    ├── City Info (Teleport API)
    ├── Housing Data (SerpAPI + Jina)
    ├── Job Data (SerpAPI + Jina)
    ├── News (News API)
    └── Neighborhoods (Radar API)
```

### Example API Call Structure
```typescript
const apiCalls = [
  // Current City API calls
  () => apiTools.getCityInfo(currentCity),
  () => apiTools.getHousingMarketData(currentCity),
  () => apiTools.getJobOpportunitiesData(currentCity),
  () => apiTools.getNewsAboutCity(currentCity),
  () => apiTools.getNeighborhoodInfo(currentCity),
  
  // Target City API calls
  () => apiTools.getCityInfo(targetCity),
  // ... similar calls for target city
];
```

## Error Handling

### 1. Base Error Interface
```typescript
interface BaseApiResponse {
  error?: string;
  details?: string | unknown;
}
```

### 2. Fallback System
```typescript
async function getFallbackCityInfo(cityName: string) {
  try {
    // Primary API call
    return await getCityInfo(cityName);
  } catch {
    // Fallback to search
    const searchResult = await searchWeb(
      `${cityName} city demographics population`
    );
    return {
      note: "Using fallback data source",
      searchResults: searchResult
    };
  }
}
```

## Type System

### API Response Types
```typescript
export interface CityInfo extends BaseApiResponse {
  city?: any;
  urbanArea?: {
    name: string;
    fullName: string;
    scores: any;
  };
}

export interface NewsData extends BaseApiResponse {
  articles?: Array<{
    title: string;
    description: string;
    url: string;
    publishedAt: string;
    source: { name: string; };
  }>;
  totalResults?: number;
}
```

## Usage Examples

### 1. Basic City Comparison
```typescript
const response = await processUserQuery(
  "Compare Chennai and San Francisco for tech jobs",
  { userId: "123", history: [], cityPreferences: [] }
);
```

### 2. Parallel API Execution
```typescript
const results = await executeInParallel(apiCalls, {
  maxConcurrent: 5,
  timeout: 15000
});
```

### 3. Response Formatting
```typescript
const cityData: CityComparisonData = {
  currentCity: {
    name: currentCity,
    info: currentCityInfo,
    housing: currentHousingData,
    // ... other data
  },
  targetCity: {
    // ... similar structure
  }
};
```

## Rate Limiting and Caching

### Rate Limit Configuration
```typescript
const RATE_LIMITS = {
  'gemini-1.5-pro': {
    requestsPerMinute: 60,
    requestsPerHour: 1000
  },
  'serper-api': {
    requestsPerMinute: 30,
    requestsPerDay: 1000
  }
};
```

### Cache Implementation
```typescript
export function getCacheStats() {
  return {
    size: cache.size,
    hits: cacheHits,
    misses: cacheMisses
  };
}
```

## Response Structure

The system generates structured responses with the following sections:

1. Cost of Living Comparison
2. Housing Market Analysis
3. Job Market Analysis
4. Recent Developments (News)
5. Neighborhood Recommendations

Each section includes:
- Data from both cities
- Error messages if applicable
- Fallback data when primary sources fail
- Comparative analysis where relevant

## Performance Considerations

- Maximum concurrent API calls: 5
- Default timeout: 15 seconds
- Retry attempts: 3
- Retry delay: 1 second
- Cache duration: 24 hours for static data

## Future Improvements

1. Enhanced error recovery
2. More sophisticated fallback mechanisms
3. Machine learning for result ranking
4. Real-time data streaming
5. Expanded API integrations 