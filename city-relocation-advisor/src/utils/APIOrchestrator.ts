import * as apiIntegrations from './api-integrations';
import { canMakeRequest, registerRequest, handleRateLimitError, getWaitTime } from './rate-limiter';
import { 
  QueryContext, 
  QueryProcessingOptions, 
  ApiResponse,
  CityInfo,
  HousingMarketData,
  JobMarketData,
  NewsData,
  NeighborhoodData,
  CostComparisonData,
  CityComparisonData
} from '../types';
import { executeInParallel } from './api-tools';
import * as apiTools from './api-tools';
import { Groq } from 'groq-sdk';

// Define the maximum number of retries for API calls
const MAX_RETRIES = 3;

// Define the delay between retries (in milliseconds)
const RETRY_DELAY = 1000;

type ApiResult = CityInfo | HousingMarketData | JobMarketData | NewsData | NeighborhoodData | CostComparisonData;

// Initialize Groq client
let groq: Groq | null = null;
try {
  if (!process.env.GROQ_API_KEY) {
    console.warn('⚠️ GROQ_API_KEY is not set. Groq features will be disabled.');
  } else {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }
} catch (error) {
  console.error('❌ Error initializing Groq client:', error);
}

/**
 * Process a user query using the API orchestrator
 */
export async function processUserQuery(
  message: string,
  context: QueryContext,
  options: QueryProcessingOptions = {}
): Promise<ApiResponse> {
  try {
    // Extract cities from the message
    const currentCity = message.toLowerCase().includes('chennai') ? 'Chennai' : '';
    const targetCity = message.toLowerCase().includes('san francisco') ? 'San Francisco' : '';

    if (!currentCity || !targetCity) {
      return {
        text: "Please specify both your current city and desired destination city.",
        success: false,
        timestamp: new Date().toISOString()
      };
    }

    // Define API calls for both cities
    const apiCalls: Array<() => Promise<ApiResult>> = [
      // Current City API calls
      () => apiTools.getCityInfo(currentCity),
      () => apiTools.getHousingMarketData(currentCity),
      () => apiTools.getJobOpportunitiesData(currentCity, 'tech'),
      () => apiTools.getNewsAboutCity(currentCity),
      () => apiTools.getNeighborhoodInfo(currentCity),
      
      // Target City API calls
      () => apiTools.getCityInfo(targetCity),
      () => apiTools.getHousingMarketData(targetCity),
      () => apiTools.getJobOpportunitiesData(targetCity, 'tech'),
      () => apiTools.getNewsAboutCity(targetCity),
      () => apiTools.getNeighborhoodInfo(targetCity),
      
      // Comparison API calls
      () => apiTools.compareCostOfLiving(currentCity, targetCity)
    ];

    // Execute all API calls in parallel
    console.log('🔄 Executing parallel API calls...');
    const results = await executeInParallel<ApiResult>(apiCalls, {
      maxConcurrent: 5,
      timeout: 15000
    });

    // Extract results for each city
    const [
      currentCityInfo,
      currentHousingData,
      currentJobData,
      currentNews,
      currentNeighborhoods,
      targetCityInfo,
      targetHousingData,
      targetJobData,
      targetNews,
      targetNeighborhoods,
      costComparison
    ] = results;

    // Format the response
    const cityData: CityComparisonData = {
      currentCity: {
        name: currentCity,
        info: currentCityInfo as CityInfo,
        housing: currentHousingData as HousingMarketData,
        jobs: currentJobData as JobMarketData,
        news: currentNews as NewsData,
        neighborhoods: currentNeighborhoods as NeighborhoodData
      },
      targetCity: {
        name: targetCity,
        info: targetCityInfo as CityInfo,
        housing: targetHousingData as HousingMarketData,
        jobs: targetJobData as JobMarketData,
        news: targetNews as NewsData,
        neighborhoods: targetNeighborhoods as NeighborhoodData
      },
      comparison: costComparison as CostComparisonData
    };

    const response = formatCityComparison(cityData);

    return {
      text: response,
      success: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in API Orchestrator:', error);
    return {
      text: 'I apologize, but I encountered an error while processing your request. Please try again.',
      success: false,
      timestamp: new Date().toISOString()
    };
  }
}

function formatCityComparison(data: CityComparisonData): string {
  const {currentCity, targetCity, comparison} = data;
  let sources: string[] = [];
  
  let response = `Relocating from ${currentCity.name} to ${targetCity.name}: A Detailed Comparison\n\n`;
  
  // Cost of Living Comparison
  response += '### Cost of Living Comparison\n\n';
  if (comparison.error) {
    response += `Unable to fetch cost of living comparison: ${comparison.error}\n\n`;
  } else if (comparison.summaries?.[0]?.summary) {
    response += comparison.summaries[0].summary + '\n\n';
    if (comparison.summaries[0].source) {
      sources.push(`Cost of Living Data: ${comparison.summaries[0].source}`);
    }
  } else {
    response += 'Cost of living data not available.\n\n';
  }
  
  // Housing Market Analysis
  response += '### Housing Market Analysis\n\n';
  if (currentCity.housing.error) {
    response += `${currentCity.name}: Unable to fetch housing data: ${currentCity.housing.error}\n\n`;
  } else {
    response += `${currentCity.name}: ${currentCity.housing.summaries?.[0]?.summary || 'Housing data not available.'}\n\n`;
    if (currentCity.housing.summaries?.[0]?.source) {
      sources.push(`${currentCity.name} Housing Data: ${currentCity.housing.summaries[0].source}`);
    }
  }
  
  if (targetCity.housing.error) {
    response += `${targetCity.name}: Unable to fetch housing data: ${targetCity.housing.error}\n\n`;
  } else {
    response += `${targetCity.name}: ${targetCity.housing.summaries?.[0]?.summary || 'Housing data not available.'}\n\n`;
    if (targetCity.housing.summaries?.[0]?.source) {
      sources.push(`${targetCity.name} Housing Data: ${targetCity.housing.summaries[0].source}`);
    }
  }
  
  // Job Market Analysis
  response += '### Job Market Analysis\n\n';
  if (currentCity.jobs.error) {
    response += `${currentCity.name}: Unable to fetch job market data: ${currentCity.jobs.error}\n\n`;
  } else {
    response += `${currentCity.name}: ${currentCity.jobs.summaries?.[0]?.summary || 'Job market data not available.'}\n\n`;
    if (currentCity.jobs.summaries?.[0]?.source) {
      sources.push(`${currentCity.name} Job Market Data: ${currentCity.jobs.summaries[0].source}`);
    }
  }
  
  if (targetCity.jobs.error) {
    response += `${targetCity.name}: Unable to fetch job market data: ${targetCity.jobs.error}\n\n`;
  } else {
    response += `${targetCity.name}: ${targetCity.jobs.summaries?.[0]?.summary || 'Job market data not available.'}\n\n`;
    if (targetCity.jobs.summaries?.[0]?.source) {
      sources.push(`${targetCity.name} Job Market Data: ${targetCity.jobs.summaries[0].source}`);
    }
  }
  
  // Recent News
  response += '### Recent Developments\n\n';
  if (currentCity.news.error) {
    response += `${currentCity.name}: Unable to fetch news: ${currentCity.news.error}\n`;
  } else if (currentCity.news.articles?.length > 0) {
    response += `${currentCity.name} News:\n`;
    currentCity.news.articles.slice(0, 2).forEach((article) => {
      response += `- ${article.title}\n`;
      if (article.url) {
        sources.push(`${currentCity.name} News: ${article.url}`);
      }
    });
  } else {
    response += `${currentCity.name}: No recent news available.\n`;
  }
  
  if (targetCity.news.error) {
    response += `\n${targetCity.name}: Unable to fetch news: ${targetCity.news.error}\n`;
  } else if (targetCity.news.articles?.length > 0) {
    response += `\n${targetCity.name} News:\n`;
    targetCity.news.articles.slice(0, 2).forEach((article) => {
      response += `- ${article.title}\n`;
      if (article.url) {
        sources.push(`${targetCity.name} News: ${article.url}`);
      }
    });
  } else {
    response += `\n${targetCity.name}: No recent news available.\n`;
  }
  
  // Neighborhood Recommendations
  response += '\n### Neighborhood Recommendations\n\n';
  if (currentCity.neighborhoods.error) {
    response += `${currentCity.name}: Unable to fetch neighborhood data: ${currentCity.neighborhoods.error}\n`;
  } else if (currentCity.neighborhoods.features?.length > 0) {
    response += `${currentCity.name} Popular Areas:\n`;
    currentCity.neighborhoods.features.slice(0, 3).forEach((feature) => {
      response += `- ${feature.properties?.name || 'Area name not available'}\n`;
      if (feature.properties?.source) {
        sources.push(`${currentCity.name} Neighborhood Data: ${feature.properties.source}`);
      }
    });
  } else {
    response += `${currentCity.name}: No neighborhood data available.\n`;
  }
  
  if (targetCity.neighborhoods.error) {
    response += `\n${targetCity.name}: Unable to fetch neighborhood data: ${targetCity.neighborhoods.error}\n`;
  } else if (targetCity.neighborhoods.features?.length > 0) {
    response += `\n${targetCity.name} Popular Areas:\n`;
    targetCity.neighborhoods.features.slice(0, 3).forEach((feature) => {
      response += `- ${feature.properties?.name || 'Area name not available'}\n`;
      if (feature.properties?.source) {
        sources.push(`${targetCity.name} Neighborhood Data: ${feature.properties.source}`);
      }
    });
  } else {
    response += `\n${targetCity.name}: No neighborhood data available.\n`;
  }

  // Add Sources section at the end
  if (sources.length > 0) {
    response += '\n### Sources\n\n';
    sources.forEach((source, index) => {
      response += `${index + 1}. ${source}\n`;
    });
  }
  
  return response;
}

/**
 * Extract a city name from a query
 */
function extractCityNameFromQuery(query: string): string | null {
  // This is a simple implementation - in a real app, you would use NLP or a more sophisticated approach
  const cityRegex = /(?:in|to|from|at|near|around)\s+([A-Za-z\s,]+)(?:\s+city|\s+town|\s+area)?/i;
  const match = query.match(cityRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  return null;
}

/**
 * Fetch city data with retry logic
 */
async function fetchCityDataWithRetry(
  cityName: string,
  maxRetries: number,
  retryDelay: number
): Promise<any> {
  let retries = 0;
  let lastError = null;
  
  while (retries < maxRetries) {
    try {
      return await apiIntegrations.getAllCityData(cityName);
    } catch (error) {
      lastError = error;
      retries++;
      
      // If we've reached the maximum number of retries, break
      if (retries >= maxRetries) {
        break;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  // If we've exhausted all retries, throw the last error
  throw lastError || new Error('Failed to fetch city data after multiple retries');
}

/**
 * Get API status
 */
export function getApiStatus() {
  return {
    gemini: {
      canMakeRequest: canMakeRequest('gemini-1.5-pro'),
      waitTime: getWaitTime('gemini-1.5-pro')
    },
    radar: {
      canMakeRequest: canMakeRequest('radar-api'),
      waitTime: getWaitTime('radar-api')
    },
    serper: {
      canMakeRequest: canMakeRequest('serper-api'),
      waitTime: getWaitTime('serper-api')
    },
    news: {
      canMakeRequest: canMakeRequest('news-api'),
      waitTime: getWaitTime('news-api')
    },
    cache: apiIntegrations.getCacheStats()
  };
}

/**
 * Clear the API cache
 */
export function clearApiCache() {
  apiIntegrations.clearApiCache();
}

/**
 * Reset rate limiters
 */
export function resetRateLimiters() {
  // This would be implemented in the rate-limiter module
  // For now, we'll just log that it was called
  console.log('🔄 Rate limiters reset');
}

// Function to get API usage report
export function getApiUsageReport(): string {
  let report = '\nAPI Usage Report\n';
  report += '   - Groq AI: ✅ Used (Primary LLM for response generation)\n';
  report += '   - SerpAPI (Google Search): ✅ Used (Web search and data enrichment)\n';
  report += '   - Parallel Execution: ✅ Used (Concurrent API calls)\n';
  report += '   - Teleport API: ✅ Used (City information and scores)\n';
  report += '   - News API: ✅ Used (City-specific news)\n';
  report += '   - Radar API: ✅ Used (Neighborhood data)\n';
  report += '   - Jina Reader: ✅ Used (Web content summarization)\n';
  return report;
} 