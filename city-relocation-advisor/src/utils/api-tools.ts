import axios from 'axios';

// Configuration for proxying requests
const proxyConfig = {
  enabled: process.env.USE_PROXY === 'true',
  url: process.env.PROXY_URL || '',
  timeout: parseInt(process.env.PROXY_TIMEOUT || '10000'),
};

// Create an axios instance with proxy if enabled
export const createAxiosInstance = () => {
  const config: any = {
    timeout: proxyConfig.timeout,
  };
  
  if (proxyConfig.enabled && proxyConfig.url) {
    console.log(`🔄 Using proxy: ${proxyConfig.url}`);
    config.proxy = {
      host: new URL(proxyConfig.url).hostname,
      port: parseInt(new URL(proxyConfig.url).port),
      protocol: new URL(proxyConfig.url).protocol.replace(':', '')
    };
  }
  
  return axios.create(config);
};

// Create a utility for logging API calls
export function logApiCall(apiName: string, params: any) {
  console.log(`\n📡 API CALL: ${apiName}`);
  console.log(`🔍 Parameters: ${JSON.stringify(params)}`);
  console.log(`⏱️ Time: ${new Date().toISOString()}`);
  if (proxyConfig.enabled) {
    console.log(`🔒 Using proxy: ${proxyConfig.url ? 'Yes' : 'No'}`);
  }
}

// Tool for searching the web using Serper API
export async function searchWeb(query: string) {
  logApiCall('Serper API (Web Search)', { query });
  
  try {
    // Check if API key is available
    if (!process.env.SERPER_API_KEY) {
      console.error('❌ Serper API key is missing');
      return { error: 'Configuration error', details: 'Serper API key is not configured' };
    }
    
    console.log('🔄 Sending request to Serper API...');
    const client = createAxiosInstance();
    const response = await client.post(
      'https://google.serper.dev/search',
      { q: query },
      {
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log(`✅ Serper API response received: ${response.data.organic?.length || 0} organic results`);
    return {
      organic: response.data.organic || [],
      knowledgeGraph: response.data.knowledgeGraph || {},
      answerBox: response.data.answerBox || {},
    };
  } catch (error) {
    console.error('❌ Error searching web:', error);
    return { error: 'Failed to search the web', details: error };
  }
}

// Tool for getting city information from Teleport API
export async function getCityInfo(cityName: string) {
  logApiCall('Teleport API (City Info)', { cityName });
  
  try {
    console.log('🔄 Sending request to Teleport API...');
    
    // Create a custom axios instance with proxy if enabled
    const client = createAxiosInstance();
    
    // Try to use a different endpoint or add a timeout to avoid hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    // Search for the city
    const searchResponse = await client.get(
      `https://api.teleport.org/api/cities/?search=${encodeURIComponent(cityName)}`,
      { signal: controller.signal }
    ).finally(() => clearTimeout(timeoutId));
    
    const searchResults = searchResponse.data._embedded['city:search-results'];
    if (!searchResults || searchResults.length === 0) {
      console.log('❌ City not found in Teleport API');
      return { error: 'City not found' };
    }
    
    console.log(`✅ Found ${searchResults.length} city matches in Teleport API`);
    
    // Get the first match
    const cityHref = searchResults[0]._links['city:item'].href;
    const cityResponse = await client.get(cityHref);
    
    // Get urban area if available
    let urbanAreaData = null;
    if (cityResponse.data._links['city:urban_area']) {
      console.log('🔄 Retrieving urban area data...');
      const urbanAreaHref = cityResponse.data._links['city:urban_area'].href;
      const urbanAreaResponse = await client.get(urbanAreaHref);
      
      // Get scores for the urban area
      const scoresHref = urbanAreaResponse.data._links['ua:scores'].href;
      const scoresResponse = await client.get(scoresHref);
      
      urbanAreaData = {
        name: urbanAreaResponse.data.name,
        fullName: urbanAreaResponse.data.full_name,
        scores: scoresResponse.data,
      };
      console.log('✅ Urban area data retrieved successfully');
    } else {
      console.log('ℹ️ No urban area data available for this city');
    }
    
    return {
      city: cityResponse.data,
      urbanArea: urbanAreaData,
    };
  } catch (error) {
    console.error('❌ Error getting city info:', error);
    
    // Check if it's a DNS resolution error
    if (error && 
        typeof error === 'object' && 
        ('code' in error) && 
        (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED')) {
      console.log('⚠️ DNS resolution error. Using fallback data source...');
      return await getFallbackCityInfo(cityName);
    }
    
    return { error: 'Failed to get city information', details: error };
  }
}

// Fallback function for city information when Teleport API is unavailable
async function getFallbackCityInfo(cityName: string) {
  try {
    console.log('🔄 Using search API as fallback for city information...');
    
    // Use searchWeb as a fallback
    const searchResult = await searchWeb(`${cityName} city demographics population cost of living quality of life`);
    
    return {
      note: "Using fallback data source due to Teleport API unavailability",
      searchResults: searchResult,
      fallbackData: {
        name: cityName,
        source: "Generated from search results",
        estimatedScores: {
          housing: "N/A - Teleport API unavailable",
          costOfLiving: "N/A - Teleport API unavailable", 
          safety: "N/A - Teleport API unavailable",
          healthcare: "N/A - Teleport API unavailable",
          education: "N/A - Teleport API unavailable",
          economy: "N/A - Teleport API unavailable"
        }
      }
    };
  } catch (error) {
    console.error('❌ Error in fallback city info:', error);
    return { 
      error: 'Failed to get city information from all sources',
      cityName: cityName
    };
  }
}

// Tool for getting news about a city
export async function getNewsAboutCity(cityName: string) {
  logApiCall('News API (City News)', { cityName });
  
  try {
    // Check if API key is available
    if (!process.env.NEWS_API_KEY) {
      console.error('❌ News API key is missing');
      return { error: 'Configuration error', details: 'News API key is not configured' };
    }
    
    console.log('🔄 Sending request to News API...');
    const client = createAxiosInstance();
    const response = await client.get('https://newsapi.org/v2/everything', {
      params: {
        q: `${cityName} (housing OR "real estate" OR "cost of living" OR "quality of life" OR relocation)`,
        sortBy: 'publishedAt',
        language: 'en',
        pageSize: 5,
      },
      headers: {
        'X-Api-Key': process.env.NEWS_API_KEY,
      },
    });
    
    console.log(`✅ News API response received: ${response.data.articles?.length || 0} articles found`);
    return {
      articles: response.data.articles || [],
      totalResults: response.data.totalResults || 0,
    };
  } catch (error) {
    console.error('❌ Error getting news:', error);
    return { error: 'Failed to get news', details: error };
  }
}

// Tool for reading and summarizing web pages using Jina Reader API
export async function summarizeWebpage(url: string) {
  try {
    const client = createAxiosInstance();
    const response = await client.post(
      'https://reader.jina.ai/api/summarize',
      { url },
      {
        headers: {
          'Authorization': `Bearer ${process.env.JINA_API_KEY || ''}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return {
      summary: response.data.summary || '',
      keyPoints: response.data.key_points || [],
    };
  } catch (error) {
    console.error('Error summarizing webpage:', error);
    return { error: 'Failed to summarize webpage', details: error };
  }
}

// Tool for getting neighborhood information using Radar API
export async function getNeighborhoodInfo(cityName: string, neighborhood?: string) {
  try {
    const query = neighborhood ? `${neighborhood}, ${cityName}` : cityName;
    
    // Check if API key is available
    if (!process.env.RADAR_API_KEY) {
      console.error('Radar API key is missing');
      return { 
        error: 'Configuration error', 
        details: 'Radar API key is not configured'
      };
    }
    
    const client = createAxiosInstance();
    const response = await client.get(
      `https://api.radar.io/v1/geocode/forward`,
      {
        params: {
          query: query,
          layers: 'neighborhood,city',
          limit: 5,
        },
        headers: {
          'Authorization': `${process.env.RADAR_API_KEY}`,
        },
        timeout: 10000, // 10 second timeout
      }
    );
    
    // Check for empty response
    if (!response.data || !response.data.addresses || response.data.addresses.length === 0) {
      return {
        features: [],
        context: response.data.meta || {},
        warning: 'No neighborhoods found'
      };
    }
    
    return {
      features: response.data.addresses || [],
      context: response.data.meta || {},
    };
  } catch (error: any) {
    console.error('Error getting neighborhood info:', error);
    
    // Handle different error types
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const status = error.response.status;
      
      if (status === 401) {
        return { 
          error: 'Authentication failed', 
          details: 'Invalid Radar API key'
        };
      } else if (status === 429) {
        return { 
          error: 'Rate limit exceeded', 
          details: 'Too many requests to Radar API'
        };
      } else {
        return { 
          error: `Server error (${status})`, 
          details: error.response.data || 'Unknown server error'
        };
      }
    } else if (error.request) {
      // The request was made but no response was received
      return { 
        error: 'No response from server', 
        details: 'Network or timeout issue'
      };
    } else {
      // Something happened in setting up the request
      return { 
        error: 'Failed to get neighborhood information', 
        details: error.message || error
      };
    }
  }
}

// Tool for getting housing market data
export async function getHousingMarketData(cityName: string) {
  // First search for reports about the city's housing market
  try {
    const searchResults = await searchWeb(`${cityName} housing market trends latest data`);
    
    // Use Jina Reader to summarize the top results if available
    let summaries = [];
    if (searchResults.organic && searchResults.organic.length > 0) {
      for (let i = 0; i < Math.min(3, searchResults.organic.length); i++) {
        if (searchResults.organic[i].link) {
          try {
            const summary = await summarizeWebpage(searchResults.organic[i].link);
            if (!summary.error) {
              summaries.push({
                title: searchResults.organic[i].title,
                source: searchResults.organic[i].link,
                summary: summary.summary,
                keyPoints: summary.keyPoints,
              });
            }
          } catch (error) {
            console.error(`Error summarizing article ${searchResults.organic[i].link}:`, error);
          }
        }
      }
    }
    
    return {
      searchResults: searchResults.organic || [],
      summaries,
    };
  } catch (error) {
    console.error('Error getting housing market data:', error);
    return { error: 'Failed to get housing market data', details: error };
  }
}

// Tool for getting job opportunities data
export async function getJobOpportunitiesData(cityName: string, field?: string) {
  try {
    const query = field 
      ? `${field} job opportunities in ${cityName} latest data`
      : `job market trends in ${cityName} latest data`;
      
    const searchResults = await searchWeb(query);
    
    // Use Jina Reader to summarize the top results if available
    let summaries = [];
    if (searchResults.organic && searchResults.organic.length > 0) {
      for (let i = 0; i < Math.min(3, searchResults.organic.length); i++) {
        if (searchResults.organic[i].link) {
          try {
            const summary = await summarizeWebpage(searchResults.organic[i].link);
            if (!summary.error) {
              summaries.push({
                title: searchResults.organic[i].title,
                source: searchResults.organic[i].link,
                summary: summary.summary,
                keyPoints: summary.keyPoints,
              });
            }
          } catch (error) {
            console.error(`Error summarizing article ${searchResults.organic[i].link}:`, error);
          }
        }
      }
    }
    
    return {
      searchResults: searchResults.organic || [],
      summaries,
    };
  } catch (error) {
    console.error('Error getting job opportunities data:', error);
    return { error: 'Failed to get job opportunities data', details: error };
  }
}

// Tool for getting school district information
export async function getSchoolDistrictInfo(cityName: string) {
  try {
    const query = `${cityName} school districts ratings latest data`;
    const searchResults = await searchWeb(query);
    
    // Use Jina Reader to summarize the top results if available
    let summaries = [];
    if (searchResults.organic && searchResults.organic.length > 0) {
      for (let i = 0; i < Math.min(3, searchResults.organic.length); i++) {
        if (searchResults.organic[i].link) {
          try {
            const summary = await summarizeWebpage(searchResults.organic[i].link);
            if (!summary.error) {
              summaries.push({
                title: searchResults.organic[i].title,
                source: searchResults.organic[i].link,
                summary: summary.summary,
                keyPoints: summary.keyPoints,
              });
            }
          } catch (error) {
            console.error(`Error summarizing article ${searchResults.organic[i].link}:`, error);
          }
        }
      }
    }
    
    return {
      searchResults: searchResults.organic || [],
      summaries,
    };
  } catch (error) {
    console.error('Error getting school district info:', error);
    return { error: 'Failed to get school district information', details: error };
  }
}

// Tool for getting public transportation information
export async function getPublicTransportationInfo(cityName: string) {
  try {
    const query = `${cityName} public transportation latest updates`;
    const searchResults = await searchWeb(query);
    
    // Use Jina Reader to summarize the top results if available
    let summaries = [];
    if (searchResults.organic && searchResults.organic.length > 0) {
      for (let i = 0; i < Math.min(3, searchResults.organic.length); i++) {
        if (searchResults.organic[i].link) {
          try {
            const summary = await summarizeWebpage(searchResults.organic[i].link);
            if (!summary.error) {
              summaries.push({
                title: searchResults.organic[i].title,
                source: searchResults.organic[i].link,
                summary: summary.summary,
                keyPoints: summary.keyPoints,
              });
            }
          } catch (error) {
            console.error(`Error summarizing article ${searchResults.organic[i].link}:`, error);
          }
        }
      }
    }
    
    return {
      searchResults: searchResults.organic || [],
      summaries,
    };
  } catch (error) {
    console.error('Error getting public transportation info:', error);
    return { error: 'Failed to get public transportation information', details: error };
  }
}

// Tool for comparing cost of living between cities
export async function compareCostOfLiving(cityA: string, cityB: string) {
  try {
    const query = `cost of living comparison between ${cityA} and ${cityB} latest data`;
    const searchResults = await searchWeb(query);
    
    // Use Jina Reader to summarize the top results if available
    let summaries = [];
    if (searchResults.organic && searchResults.organic.length > 0) {
      for (let i = 0; i < Math.min(3, searchResults.organic.length); i++) {
        if (searchResults.organic[i].link) {
          try {
            const summary = await summarizeWebpage(searchResults.organic[i].link);
            if (!summary.error) {
              summaries.push({
                title: searchResults.organic[i].title,
                source: searchResults.organic[i].link,
                summary: summary.summary,
                keyPoints: summary.keyPoints,
              });
            }
          } catch (error) {
            console.error(`Error summarizing article ${searchResults.organic[i].link}:`, error);
          }
        }
      }
    }
    
    return {
      searchResults: searchResults.organic || [],
      summaries,
    };
  } catch (error) {
    console.error('Error comparing cost of living:', error);
    return { error: 'Failed to compare cost of living', details: error };
  }
}

// Function to try multiple APIs for the same data with fallbacks
export async function getReliableCityData(cityName: string) {
  console.log(`\n🔄 Getting reliable city data for: ${cityName}`);
  
  // First try the primary source (Teleport API)
  let cityInfo = await getCityInfo(cityName);
  
  // If primary source failed or returned error, try web search as additional source
  if ('error' in cityInfo) {
    console.log(`⚠️ Primary source failed, enriching with web search data...`);
    const webData = await searchWeb(`${cityName} city statistics demographics`);
    
    // If cityInfo has error and cityName, create a proper fallback response
    return {
      error: cityInfo.error,
      cityName: cityName,
      alternativeData: webData,
      source: 'Web search fallback'
    };
  }
  
  return cityInfo;
}

// Function to implement retry logic for any API call
export async function withRetry<T>(
  apiCall: () => Promise<T>,
  options = { 
    retries: 2, 
    delay: 1000,
    apiName: 'Unknown API'
  }
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= options.retries + 1; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`🔄 Retry attempt ${attempt-1} for ${options.apiName}...`);
      }
      return await apiCall();
    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt} failed for ${options.apiName}:`, error);
      
      if (attempt <= options.retries) {
        console.log(`⏱️ Waiting ${options.delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, options.delay));
        // Exponential backoff
        options.delay *= 2;
      }
    }
  }
  
  throw lastError;
}

// Function to display an ASCII art dashboard of the API status
export async function displayApiHealthDashboard(apiStatus: any) {
  const networkHealthy = await checkNetworkHealth();
  
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║             🌐 CITY RELOCATION ADVISOR - API HEALTH           ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║ API                 │ Status    │ Mode                        ║');
  console.log('╠═════════════════════╪═══════════╪═════════════════════════════╣');
  console.log(`║ Gemini API          │ ${apiStatus.gemini ? '✅ ONLINE ' : '❌ OFFLINE'} │ ${apiStatus.proxy?.enabled ? '🔒 Proxy  ' : '🔓 Direct '} ║`);
  console.log(`║ Serper (Search)     │ ${apiStatus.serper ? '✅ ONLINE ' : '❌ OFFLINE'} │ ${apiStatus.proxy?.enabled ? '🔒 Proxy  ' : '🔓 Direct '} ║`);
  console.log(`║ News API            │ ${apiStatus.newsApi ? '✅ ONLINE ' : '❌ OFFLINE'} │ ${apiStatus.proxy?.enabled ? '🔒 Proxy  ' : '🔓 Direct '} ║`);
  console.log(`║ Jina Reader         │ ${apiStatus.jinaReader ? '✅ ONLINE ' : '❌ OFFLINE'} │ ${apiStatus.proxy?.enabled ? '🔒 Proxy  ' : '🔓 Direct '} ║`);
  console.log(`║ Radar API           │ ${apiStatus.radar ? '✅ ONLINE ' : '❌ OFFLINE'} │ ${apiStatus.proxy?.enabled ? '🔒 Proxy  ' : '🔓 Direct '} ║`);
  console.log(`║ Teleport            │ ${'ℹ️ DYNAMIC'} │ ${apiStatus.proxy?.enabled ? '🔒 Proxy  ' : '🔓 Direct '} ║`);
  console.log(`║ Supabase Database   │ ${apiStatus.supabase ? '✅ ONLINE ' : '❌ OFFLINE'} │ ${apiStatus.memoryOnly ? '💾 Memory Only' : '💿 Persistent '} ║`);
  console.log('╠═════════════════════╪═══════════╪═════════════════════════════╣');
  console.log(`║ Network Status: ${networkHealthy ? '🟢 Connected' : '🔴 Disrupted'} │ ${new Date().toISOString()} ║`);
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  return {
    timestamp: new Date().toISOString(),
    networkHealthy,
    apiStatus
  };
}

// Quick function to check if we have network connectivity
async function checkNetworkHealth(): Promise<boolean> {
  try {
    // Attempt to reach Google's DNS server which is reliable
    await axios.get('https://dns.google.com', { 
      timeout: 3000,
      validateStatus: () => true
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Tool for searching Google using SerpAPI
export async function searchGoogle(query: string) {
  logApiCall('SerpAPI (Google Search)', { query });
  
  try {
    // Check if API key is available
    if (!process.env.SERPAPI_API_KEY) {
      console.error('❌ SerpAPI key is missing');
      return { error: 'Configuration error', details: 'SerpAPI key is not configured' };
    }
    
    console.log('🔄 Sending request to SerpAPI...');
    const client = createAxiosInstance();
    const response = await client.get('https://serpapi.com/search', {
      params: {
        q: query,
        api_key: process.env.SERPAPI_API_KEY,
        engine: 'google',
        num: 10
      }
    });
    
    console.log(`✅ SerpAPI response received: ${response.data.organic_results?.length || 0} organic results`);
    return {
      organic_results: response.data.organic_results || [],
      knowledge_graph: response.data.knowledge_graph || {},
      answer_box: response.data.answer_box || {},
      related_searches: response.data.related_searches || [],
      pagination: response.data.pagination || {}
    };
  } catch (error) {
    console.error('❌ Error searching Google:', error);
    return { error: 'Failed to search Google', details: error };
  }
}

// Utility for executing multiple API calls in parallel
export async function executeInParallel<T>(
  functions: Array<() => Promise<T>>,
  options: {
    maxConcurrent?: number;
    timeout?: number;
  } = {}
): Promise<Array<T>> {
  const {
    maxConcurrent = 3,
    timeout = 30000
  } = options;

  const results: T[] = [];
  const errors: Error[] = [];
  
  // Process functions in chunks to limit concurrent executions
  for (let i = 0; i < functions.length; i += maxConcurrent) {
    const chunk = functions.slice(i, i + maxConcurrent);
    const chunkPromises = chunk.map(async (fn) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const result = await Promise.race([
          fn(),
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error('Operation timed out')), timeout)
          )
        ]);
        
        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        console.error('❌ Error in parallel execution:', error);
        errors.push(error as Error);
        return null;
      }
    });
    
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...(chunkResults.filter(r => r !== null) as T[]));
  }
  
  if (errors.length > 0) {
    console.warn(`⚠️ ${errors.length} errors occurred during parallel execution`);
  }
  
  return results;
} 