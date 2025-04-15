import axios from 'axios';
import { createAxiosInstance, logApiCall, withRetry } from './api-tools';

// Define cache for API responses
const apiCache: Record<string, {
  data: any,
  timestamp: number,
  expiry: number
}> = {};

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Get data from cache if available and not expired
 */
function getFromCache(cacheKey: string): any | null {
  const cachedItem = apiCache[cacheKey];
  if (!cachedItem) return null;
  
  const now = Date.now();
  if (now - cachedItem.timestamp > CACHE_TTL) {
    console.log(`Cache expired for ${cacheKey}`);
    delete apiCache[cacheKey];
    return null;
  }
  
  console.log(`Using cached data for ${cacheKey}`);
  return cachedItem.data;
}

/**
 * Store data in cache
 */
function storeInCache(cacheKey: string, data: any): void {
  apiCache[cacheKey] = {
    data,
    timestamp: Date.now(),
    expiry: Date.now() + CACHE_TTL
  };
  console.log(`Stored data in cache for ${cacheKey}`);
}

/**
 * Radar API Integration
 * Documentation: https://radar.com/documentation/api
 */
export async function getRadarData(params: any) {
  const cacheKey = `radar_${JSON.stringify(params)}`;
  const cachedData = getFromCache(cacheKey);
  if (cachedData) return cachedData;
  
  logApiCall('Radar API', params);
  
  try {
    // Check if API key is available
    if (!process.env.RADAR_API_KEY) {
      console.error('❌ Radar API key is missing');
      return { error: 'Configuration error', details: 'Radar API key is not configured' };
    }
    
    console.log('🔄 Sending request to Radar API...');
    const client = createAxiosInstance();
    
    // Determine which Radar API endpoint to use based on params
    let endpoint = '';
    let requestData = {};
    
    if (params.type === 'geofence') {
      endpoint = 'https://api.radar.io/v1/geofences';
      requestData = {
        description: params.description,
        tag: params.tag,
        externalId: params.externalId,
        type: 'circle',
        coordinates: [params.longitude, params.latitude],
        radius: params.radius,
        enabled: true
      };
    } else if (params.type === 'search') {
      endpoint = 'https://api.radar.io/v1/search/places';
      requestData = {
        near: {
          latitude: params.latitude,
          longitude: params.longitude
        },
        radius: params.radius || 1000,
        categories: params.categories || ['food', 'retail', 'education', 'health'],
        limit: params.limit || 10
      };
    } else if (params.type === 'geocode') {
      endpoint = 'https://api.radar.io/v1/geocode/forward';
      requestData = {
        query: params.query
      };
    } else {
      return { error: 'Invalid Radar API request type', details: params.type };
    }
    
    const response = await withRetry(
      () => client.post(endpoint, requestData, {
        headers: {
          'Authorization': process.env.RADAR_API_KEY,
          'Content-Type': 'application/json'
        }
      }),
      { retries: 2, delay: 1000, apiName: 'Radar API' }
    );
    
    console.log('✅ Radar API response received');
    const responseData = response.data as any;
    storeInCache(cacheKey, responseData);
    return responseData;
  } catch (error) {
    console.error('❌ Error calling Radar API:', error);
    return { error: 'API error', details: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Serper API Integration
 * Documentation: https://serper.dev/
 */
export async function getSerperData(query: string, options: any = {}) {
  const cacheKey = `serper_${query}_${JSON.stringify(options)}`;
  const cachedData = getFromCache(cacheKey);
  if (cachedData) return cachedData;
  
  logApiCall('Serper API', { query, options });
  
  try {
    // Check if API key is available
    if (!process.env.SERPER_API_KEY) {
      console.error('❌ Serper API key is missing');
      return { error: 'Configuration error', details: 'Serper API key is not configured' };
    }
    
    console.log('🔄 Sending request to Serper API...');
    const client = createAxiosInstance();
    
    const response = await withRetry(
      () => client.post('https://google.serper.dev/search', 
        { 
          q: query,
          ...options
        },
        {
          headers: {
            'X-API-KEY': process.env.SERPER_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      ),
      { retries: 2, delay: 1000, apiName: 'Serper API' }
    );
    
    console.log('✅ Serper API response received');
    const responseData = response.data as any;
    storeInCache(cacheKey, responseData);
    return responseData;
  } catch (error) {
    console.error('❌ Error calling Serper API:', error);
    return { error: 'API error', details: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * News API Integration
 * Documentation: https://newsapi.org/docs
 */
export async function getNewsData(query: string, options: any = {}) {
  const cacheKey = `news_${query}_${JSON.stringify(options)}`;
  const cachedData = getFromCache(cacheKey);
  if (cachedData) return cachedData;
  
  logApiCall('News API', { query, options });
  
  try {
    // Check if API key is available
    if (!process.env.NEWS_API_KEY) {
      console.error('❌ News API key is missing');
      return { error: 'Configuration error', details: 'News API key is not configured' };
    }
    
    console.log('🔄 Sending request to News API...');
    const client = createAxiosInstance();
    
    const response = await withRetry(
      () => client.get('https://newsapi.org/v2/everything', {
        params: {
          q: query,
          apiKey: process.env.NEWS_API_KEY,
          language: options.language || 'en',
          sortBy: options.sortBy || 'relevancy',
          pageSize: options.pageSize || 10,
          page: options.page || 1,
          ...options
        }
      }),
      { retries: 2, delay: 1000, apiName: 'News API' }
    );
    
    console.log('✅ News API response received');
    const responseData = response.data as any;
    storeInCache(cacheKey, responseData);
    return responseData;
  } catch (error) {
    console.error('❌ Error calling News API:', error);
    return { error: 'API error', details: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get all API data for a city
 */
export async function getAllCityData(cityName: string) {
  console.log(`🔄 Fetching all API data for city: ${cityName}`);
  
  // First, geocode the city to get coordinates
  const geocodeResult = await getRadarData({
    type: 'geocode',
    query: cityName
  });
  
  if (geocodeResult.error) {
    console.error('❌ Error geocoding city:', geocodeResult.error);
    return { error: 'Geocoding error', details: geocodeResult.error };
  }
  
  // Extract coordinates
  const coordinates = geocodeResult.addresses?.[0]?.geometry?.coordinates;
  if (!coordinates) {
    console.error('❌ No coordinates found for city');
    return { error: 'Geocoding error', details: 'No coordinates found for city' };
  }
  
  const [longitude, latitude] = coordinates;
  
  // Fetch data from all APIs in parallel
  const [radarData, serperData, newsData] = await Promise.all([
    getRadarData({
      type: 'search',
      latitude,
      longitude,
      radius: 5000,
      categories: ['food', 'retail', 'education', 'health', 'entertainment'],
      limit: 20
    }),
    getSerperData(`${cityName} city information living cost housing jobs schools`),
    getNewsData(cityName, { sortBy: 'relevancy', pageSize: 10 })
  ]);
  
  // Combine all data
  const combinedData = {
    cityName,
    coordinates: { latitude, longitude },
    radar: radarData,
    serper: serperData,
    news: newsData,
    timestamp: Date.now()
  };
  
  // Store in cache
  const cacheKey = `city_data_${cityName.toLowerCase().replace(/\s+/g, '_')}`;
  storeInCache(cacheKey, combinedData);
  
  return combinedData;
}

/**
 * Get cached city data if available
 */
export function getCachedCityData(cityName: string) {
  const cacheKey = `city_data_${cityName.toLowerCase().replace(/\s+/g, '_')}`;
  return getFromCache(cacheKey);
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const now = Date.now();
  const stats = {
    total: Object.keys(apiCache).length,
    expired: 0,
    active: 0,
    byApi: {
      radar: 0,
      serper: 0,
      news: 0,
      city: 0
    }
  };
  
  Object.entries(apiCache).forEach(([key, value]) => {
    if (now >= value.expiry) {
      stats.expired++;
    } else {
      stats.active++;
      
      if (key.startsWith('radar:')) {
        stats.byApi.radar++;
      } else if (key.startsWith('serper:')) {
        stats.byApi.serper++;
      } else if (key.startsWith('news:')) {
        stats.byApi.news++;
      } else if (key.startsWith('city:')) {
        stats.byApi.city++;
      }
    }
  });
  
  return stats;
}

/**
 * Clear the API cache
 */
export function clearApiCache() {
  Object.keys(apiCache).forEach(key => {
    delete apiCache[key];
  });
  
  console.log('🧹 API cache cleared');
} 