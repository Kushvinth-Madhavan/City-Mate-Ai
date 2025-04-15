import { ParsedIntent, QueryIntent } from '../intent/IntentParser';
import * as apiTools from '@/utils/api-tools';
import * as apiIntegrations from '@/utils/api-integrations';
import { withRetry } from '@/utils/api-tools';

// Define the results structure from each API
export interface APIResults {
  cityInfo?: any;
  webSearch?: any;
  news?: any;
  neighborhoods?: any;
  housingMarket?: any;
  jobOpportunities?: any;
  schoolDistricts?: any;
  transportation?: any;
  costOfLiving?: any;
  summaries?: any[];
  error?: string;
}

export class APIOrchestrator {
  /**
   * Determine which APIs to call based on intent
   */
  static getRequiredApis(intent: QueryIntent): string[] {
    const baseApis = ['webSearch']; // Always included for general information
    
    switch (intent) {
      case QueryIntent.CITY_INFO:
        return [...baseApis, 'cityInfo', 'news'];
        
      case QueryIntent.CITY_COMPARISON:
        return [...baseApis, 'cityInfo', 'costOfLiving', 'housingMarket'];
        
      case QueryIntent.NEIGHBORHOOD_RECOMMENDATION:
        return [...baseApis, 'cityInfo', 'neighborhoods'];
        
      case QueryIntent.HOUSING_MARKET:
        return [...baseApis, 'cityInfo', 'housingMarket', 'neighborhoods'];
        
      case QueryIntent.JOB_OPPORTUNITIES:
        return [...baseApis, 'cityInfo', 'jobOpportunities'];
        
      case QueryIntent.SCHOOL_DISTRICTS:
        return [...baseApis, 'cityInfo', 'schoolDistricts'];
        
      case QueryIntent.TRANSPORTATION:
        return [...baseApis, 'cityInfo', 'transportation'];
        
      case QueryIntent.COST_OF_LIVING:
        return [...baseApis, 'cityInfo', 'costOfLiving', 'housingMarket'];
        
      case QueryIntent.LIFESTYLE_MATCH:
        return [...baseApis, 'cityInfo', 'neighborhoods', 'news'];
        
      case QueryIntent.RELOCATION_LOGISTICS:
        return [...baseApis, 'cityInfo'];
        
      case QueryIntent.GENERAL_ADVICE:
      case QueryIntent.OTHER:
      default:
        return baseApis;
    }
  }

  /**
   * Call a specific API with retry logic
   */
  static async callApi(apiName: string, params: any): Promise<any> {
    try {
      console.log(`📡 Calling API: ${apiName} with params:`, params);
      
      switch (apiName) {
        case 'cityInfo':
          return await withRetry(() => apiTools.getCityInfo(params.city), 
            { retries: 2, delay: 1000, apiName: 'Teleport City API' });
          
        case 'webSearch':
          return await withRetry(() => apiIntegrations.getSerperData(params.query), 
            { retries: 2, delay: 1000, apiName: 'Serper Web Search API' });
          
        case 'news':
          return await withRetry(() => apiIntegrations.getNewsData(params.city), 
            { retries: 2, delay: 1000, apiName: 'News API' });
          
        case 'neighborhoods':
          return await withRetry(() => apiIntegrations.getRadarData({
            type: 'search',
            latitude: params.latitude,
            longitude: params.longitude,
            radius: 5000,
            categories: ['residential', 'neighborhood'],
            limit: 20
          }), { retries: 2, delay: 1000, apiName: 'Radar API' });
          
        case 'housingMarket':
          return await withRetry(() => apiTools.getHousingMarketData(params.city), 
            { retries: 2, delay: 1000, apiName: 'Housing Market Data' });
          
        case 'jobOpportunities':
          return await withRetry(() => apiTools.getJobOpportunitiesData(params.city, params.industry), 
            { retries: 2, delay: 1000, apiName: 'Job Opportunities Data' });
          
        case 'schoolDistricts':
          return await withRetry(() => apiTools.getSchoolDistrictInfo(params.city), 
            { retries: 2, delay: 1000, apiName: 'School District Info' });
          
        case 'transportation':
          return await withRetry(() => apiTools.getPublicTransportationInfo(params.city), 
            { retries: 2, delay: 1000, apiName: 'Public Transportation Info' });
          
        case 'costOfLiving':
          if (params.cityB) {
            return await withRetry(() => apiTools.compareCostOfLiving(params.cityA, params.cityB), 
              { retries: 2, delay: 1000, apiName: 'Cost of Living Comparison' });
          } else {
            return await withRetry(() => apiTools.getReliableCityData(params.city), 
              { retries: 2, delay: 1000, apiName: 'City Data' });
          }
          
        case 'summaries':
          return await withRetry(() => apiTools.summarizeWebpage(params.url), 
            { retries: 2, delay: 1000, apiName: 'Webpage Summarization' });
          
        default:
          console.warn(`⚠️ Unknown API: ${apiName}`);
          return { error: `Unknown API: ${apiName}` };
      }
    } catch (error) {
      console.error(`❌ Error calling ${apiName}:`, error);
      return { error: `Error calling ${apiName}`, details: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Call multiple APIs in parallel
   */
  static async callMultipleApis(apiNames: string[], params: Record<string, any>): Promise<Record<string, any>> {
    console.log(`🔄 Calling multiple APIs: ${apiNames.join(', ')}`);
    
    const results: Record<string, any> = {};
    const apiCalls = apiNames.map(apiName => 
      this.callApi(apiName, params[apiName] || params)
        .then(result => {
          results[apiName] = result;
        })
        .catch(error => {
          console.error(`❌ Error calling ${apiName}:`, error);
          results[apiName] = { error: `Error calling ${apiName}`, details: error instanceof Error ? error.message : 'Unknown error' };
        })
    );
    
    await Promise.all(apiCalls);
    return results;
  }

  /**
   * Build API queries based on parsed intent
   */
  static buildApiQueries(parsedIntent: ParsedIntent): Record<string, any> {
    const queries: Record<string, any> = {};
    
    // Extract city names from intent
    const cities = parsedIntent.locations.cities || [];
    
    if (cities.length > 0) {
      const primaryCity = cities[0];
      
      // Add city-specific queries
      queries.cityInfo = { city: primaryCity };
      queries.news = { city: primaryCity };
      queries.neighborhoods = { city: primaryCity };
      queries.housingMarket = { city: primaryCity };
      queries.jobOpportunities = { city: primaryCity };
      queries.schoolDistricts = { city: primaryCity };
      queries.transportation = { city: primaryCity };
      queries.costOfLiving = { city: primaryCity };
      
      // Add web search query
      queries.webSearch = { query: `${primaryCity} city information living cost housing jobs schools` };
      
      // Add comparison if two cities are mentioned
      if (cities.length > 1) {
        queries.costOfLiving = { cityA: primaryCity, cityB: cities[1] };
      }
    } else {
      // Generic web search if no city is mentioned
      queries.webSearch = { query: parsedIntent.originalQuery };
    }
    
    return queries;
  }

  /**
   * Fetch data from all required APIs based on intent
   */
  static async fetch(parsedIntent: ParsedIntent): Promise<APIResults> {
    console.log('🔄 Orchestrating API calls based on intent:', parsedIntent.intent);
    
    // Get required APIs based on intent
    const requiredApis = this.getRequiredApis(parsedIntent.intent);
    console.log(`📡 Required APIs: ${requiredApis.join(', ')}`);
    
    // Build API queries
    const queries = this.buildApiQueries(parsedIntent);
    
    // Call all required APIs in parallel
    const results = await this.callMultipleApis(requiredApis, queries);
    
    // Check if we have cached data for the city
    const cities = parsedIntent.locations.cities || [];
    if (cities.length > 0) {
      const primaryCity = cities[0];
      const cachedData = apiIntegrations.getCachedCityData(primaryCity);
      
      if (cachedData) {
        console.log(`🔄 Using cached data for ${primaryCity}`);
        
        // Merge cached data with results
        if (cachedData.radar && !results.neighborhoods) {
          results.neighborhoods = cachedData.radar;
        }
        
        if (cachedData.serper && !results.webSearch) {
          results.webSearch = cachedData.serper;
        }
        
        if (cachedData.news && !results.news) {
          results.news = cachedData.news;
        }
      } else {
        // Fetch all data for the city and cache it
        console.log(`🔄 Fetching all data for ${primaryCity} to cache`);
        apiIntegrations.getAllCityData(primaryCity).catch(error => {
          console.error(`❌ Error fetching all data for ${primaryCity}:`, error);
        });
      }
    }
    
    return results as APIResults;
  }
} 