import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Groq } from 'groq-sdk';
import { 
  canMakeRequest, 
  registerRequest, 
  handleRateLimitError, 
  getWaitTime,
  extractRetryDelay
} from '@/utils/rate-limiter';
import { ConversationMemory } from '@/utils/conversationMemory';

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

// Initialize other API keys
const RADAR_API_KEY = process.env.RADAR_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const JINA_API_KEY = process.env.JINA_API_KEY;

export async function POST(req: NextRequest) {
  const requestStart = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);
  
  console.log(`\n🔄 [${requestId}] Processing chat API request...`);
  
  try {
    // Extract the request data
    const requestData = await req.json();
    const { 
      userId = uuidv4(), 
      message,
      currentLocation,
      desiredLocation 
    } = requestData;
    
    // Validate the incoming data
    if (!currentLocation || !desiredLocation) {
      return NextResponse.json(
        { error: 'Both current and desired locations are required' },
        { status: 400 }
      );
    }

    // Get relevant conversation context
    const conversationContext = await ConversationMemory.getRelevantContext(userId, message);

    // Track API usage
    const apiUsage = {
      groq: false,
      radar: false,
      serper: false,
      newsApi: false,
      jinaReader: false
    };

    // Parallel API calls for data gathering
    const apiCalls = [
      getLocationData(currentLocation, desiredLocation),
      getWebSearchResults(currentLocation, desiredLocation),
      getCityNews(currentLocation, desiredLocation),
      getContentSummaries(currentLocation, desiredLocation)
    ];

    const [locationData, webResults, newsData, summaries] = await Promise.all(apiCalls);

    // Update API usage flags
    apiUsage.radar = !!locationData;
    apiUsage.serper = !!webResults;
    apiUsage.newsApi = !!newsData;
    apiUsage.jinaReader = !!summaries;

    // Prepare context for Groq
    const context = {
      currentLocation,
      desiredLocation,
      locationData,
      webResults,
      newsData,
      summaries,
      conversationHistory: conversationContext
    };

    // Generate response with Groq or fallback
    let response;
    if (groq) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are a city relocation advisor helping someone move from ${currentLocation} to ${desiredLocation}. 
              Previous conversation context:
              ${conversationContext}
              
              Analyze the provided data and give detailed, helpful advice about the relocation. Focus on:
              1. Cost of living differences
              2. Housing market comparison
              3. Job market and opportunities
              4. Quality of life factors
              5. Specific neighborhood recommendations
              6. Practical relocation advice
              
              Important Instructions:
              - Consider the previous conversation context when providing advice
              - Do NOT include any <think> tags or thinking process in your response
              - Start directly with the analysis and advice
              - Keep the response clear and professional
              - For each piece of information, include the source URL where it came from
              - At the end of your response, list all sources used`
            },
            {
              role: 'user',
              content: message
            },
            {
              role: 'system',
              content: `Here is the relevant data about both cities: ${JSON.stringify(context)}`
            }
          ],
          model: 'deepseek-r1-distill-llama-70b',
          temperature: 0.7,
          max_tokens: 2048,
        });

        apiUsage.groq = true;
        response = {
          text: completion.choices[0].message.content,
          apiUsage
        };

        // Store the conversation turn
        await ConversationMemory.addTurn(userId, 'user', message, { currentLocation, desiredLocation });
        await ConversationMemory.addTurn(userId, 'assistant', response.text);

      } catch (error) {
        console.error(`❌ [${requestId}] Groq API error:`, error);
        // Fallback to basic response with sources
        const sources = [];
        if (locationData?.current?.source) sources.push(`Location Data (${currentLocation}): ${locationData.current.source}`);
        if (locationData?.desired?.source) sources.push(`Location Data (${desiredLocation}): ${locationData.desired.source}`);
        if (webResults?.current?.source) sources.push(`Web Search (${currentLocation}): ${webResults.current.source}`);
        if (webResults?.desired?.source) sources.push(`Web Search (${desiredLocation}): ${webResults.desired.source}`);
        if (newsData?.current?.[0]?.source) sources.push(`News (${currentLocation}): ${newsData.current[0].source}`);
        if (newsData?.desired?.[0]?.source) sources.push(`News (${desiredLocation}): ${newsData.desired[0].source}`);
        if (summaries?.current?.source) sources.push(`City Info (${currentLocation}): ${summaries.current.source}`);
        if (summaries?.desired?.source) sources.push(`City Info (${desiredLocation}): ${summaries.desired.source}`);

        response = {
          text: `I apologize, but I'm having trouble accessing the advanced AI features. Here's what I can tell you about moving from ${currentLocation} to ${desiredLocation}:\n\n` +
            `1. Cost of Living: ${locationData ? 'Data available' : 'Data not available'}\n` +
            `2. Housing Market: ${locationData ? 'Data available' : 'Data not available'}\n` +
            `3. Job Market: ${webResults ? 'Data available' : 'Data not available'}\n` +
            `4. Quality of Life: ${locationData ? 'Data available' : 'Data not available'}\n` +
            `5. Recent News: ${newsData ? 'Data available' : 'Data not available'}\n\n` +
            `Please try again later for a more detailed analysis.\n\n` +
            (sources.length > 0 ? `Sources:\n${sources.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : ''),
          apiUsage
        };
      }
    } else {
      // No Groq client available, use fallback with sources
      const sources = [];
      if (locationData?.current?.source) sources.push(`Location Data (${currentLocation}): ${locationData.current.source}`);
      if (locationData?.desired?.source) sources.push(`Location Data (${desiredLocation}): ${locationData.desired.source}`);
      if (webResults?.current?.source) sources.push(`Web Search (${currentLocation}): ${webResults.current.source}`);
      if (webResults?.desired?.source) sources.push(`Web Search (${desiredLocation}): ${webResults.desired.source}`);
      if (newsData?.current?.[0]?.source) sources.push(`News (${currentLocation}): ${newsData.current[0].source}`);
      if (newsData?.desired?.[0]?.source) sources.push(`News (${desiredLocation}): ${newsData.desired[0].source}`);
      if (summaries?.current?.source) sources.push(`City Info (${currentLocation}): ${summaries.current.source}`);
      if (summaries?.desired?.source) sources.push(`City Info (${desiredLocation}): ${summaries.desired.source}`);

      response = {
        text: `I apologize, but the advanced AI features are currently unavailable. Here's what I can tell you about moving from ${currentLocation} to ${desiredLocation}:\n\n` +
          `1. Cost of Living: ${locationData ? 'Data available' : 'Data not available'}\n` +
          `2. Housing Market: ${locationData ? 'Data available' : 'Data not available'}\n` +
          `3. Job Market: ${webResults ? 'Data available' : 'Data not available'}\n` +
          `4. Quality of Life: ${locationData ? 'Data available' : 'Data not available'}\n` +
          `5. Recent News: ${newsData ? 'Data available' : 'Data not available'}\n\n` +
          `Please try again later for a more detailed analysis.\n\n` +
          (sources.length > 0 ? `Sources:\n${sources.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : ''),
        apiUsage
      };
    }

    // Log completion and API usage
    const requestDuration = Date.now() - requestStart;
    console.log(`\n📊 [${requestId}] Request completed in ${requestDuration}ms`);
    console.log(`📡 [${requestId}] API usage:`);
    console.log(`   - Groq API: ${apiUsage.groq ? '✅ Used' : '❌ Not used'}`);
    console.log(`   - Radar API: ${apiUsage.radar ? '✅ Used' : '❌ Not used'}`);
    console.log(`   - Serper API: ${apiUsage.serper ? '✅ Used' : '❌ Not used'}`);
    console.log(`   - News API: ${apiUsage.newsApi ? '✅ Used' : '❌ Not used'}`);
    console.log(`   - Jina Reader API: ${apiUsage.jinaReader ? '✅ Used' : '❌ Not used'}`);

    return NextResponse.json({ response });
  } catch (error) {
    console.error(`❌ [${requestId}] Error:`, error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}

// Helper function to get location data from Radar API
async function getLocationData(currentLocation: string, desiredLocation: string) {
  if (!RADAR_API_KEY) return null;
  
  try {
    const [currentData, desiredData] = await Promise.all([
      axios.get(`https://api.radar.io/v1/geocode/forward`, {
        params: { query: currentLocation },
        headers: { 'Authorization': RADAR_API_KEY }
      }),
      axios.get(`https://api.radar.io/v1/geocode/forward`, {
        params: { query: desiredLocation },
        headers: { 'Authorization': RADAR_API_KEY }
      })
    ]);

    return {
      current: {
        ...currentData.data,
        source: 'https://radar.io'
      },
      desired: {
        ...desiredData.data,
        source: 'https://radar.io'
      }
    };
  } catch (error) {
    console.error('Error fetching location data:', error);
    return null;
  }
}

// Helper function to get web search results from Serper API
async function getWebSearchResults(currentLocation: string, desiredLocation: string) {
  if (!SERPER_API_KEY) return null;

  try {
    const [currentResults, desiredResults] = await Promise.all([
      axios.post('https://google.serper.dev/search', {
        q: `${currentLocation} city living cost housing market quality of life`,
        num: 5
      }, {
        headers: { 'X-API-KEY': SERPER_API_KEY }
      }),
      axios.post('https://google.serper.dev/search', {
        q: `${desiredLocation} city living cost housing market quality of life`,
        num: 5
      }, {
        headers: { 'X-API-KEY': SERPER_API_KEY }
      })
    ]);

    return {
      current: {
        ...currentResults.data,
        source: 'https://google.serper.dev'
      },
      desired: {
        ...desiredResults.data,
        source: 'https://google.serper.dev'
      }
    };
  } catch (error) {
    console.error('Error fetching web results:', error);
    return null;
  }
}

// Helper function to get news from News API
async function getCityNews(currentLocation: string, desiredLocation: string) {
  if (!NEWS_API_KEY) return null;

  try {
    const [currentNews, desiredNews] = await Promise.all([
      axios.get(`https://newsapi.org/v2/everything`, {
        params: {
          q: currentLocation,
          sortBy: 'relevancy',
          pageSize: 5,
          apiKey: NEWS_API_KEY
        }
      }),
      axios.get(`https://newsapi.org/v2/everything`, {
        params: {
          q: desiredLocation,
          sortBy: 'relevancy',
          pageSize: 5,
          apiKey: NEWS_API_KEY
        }
      })
    ]);

    // Add source URL to each article
    const processArticles = (articles: any[]) => articles.map(article => ({
      ...article,
      source: article.url || 'https://newsapi.org'
    }));

    return {
      current: processArticles(currentNews.data.articles),
      desired: processArticles(desiredNews.data.articles)
    };
  } catch (error) {
    console.error('Error fetching news:', error);
    return null;
  }
}

// Helper function to get content summaries from Jina AI
async function getContentSummaries(currentLocation: string, desiredLocation: string) {
  if (!JINA_API_KEY) return null;

  try {
    // Format locations for URLs (replace spaces with dashes and make lowercase)
    const formatLocation = (loc: string) => encodeURIComponent(loc.toLowerCase().trim());
    const currentFormatted = formatLocation(currentLocation);
    const desiredFormatted = formatLocation(desiredLocation);

    // Define multiple URL sources for each city
    const getUrlsForCity = (city: string) => [
      `https://www.bestplaces.net/city/${city}`,
      `https://www.areavibes.com/${city}`,
      `https://www.city-data.com/city/${city}.html`,
      `https://www.niche.com/places-to-live/${city}`,
      `https://www.neighborhoodscout.com/${city}`,
      `https://www.realtor.com/local/${city}`,
      `https://www.zillow.com/${city}`,
      `https://www.trulia.com/city/${city}`,
      `https://www.walkscore.com/${city}`,
      `https://www.greatschools.org/search/search.page?q=${city}`,
      `https://www.numbeo.com/cost-of-living/in/${city}`,
      `https://www.payscale.com/cost-of-living-calculator/${city}`,
      `https://www.apartments.com/${city}`,
    ];

    const currentCityUrls = getUrlsForCity(currentFormatted);
    const desiredCityUrls = getUrlsForCity(desiredFormatted);

    // Try to get summaries for each city using multiple URLs
    const getSummaryForCity = async (urls: string[]) => {
      for (const url of urls) {
        try {
          const response = await axios.post('https://api.jina.ai/v1/reader', {
            url,
            mode: 'summarize'
          }, {
            headers: { 'Authorization': `Bearer ${JINA_API_KEY}` }
          });
          
          if (response.data && response.data.summary) {
            return {
              ...response.data,
              source: url,
              success: true
            };
          }
        } catch (error: any) {
          console.warn(`Warning: Failed to get summary for ${url}:`, error?.message || 'Unknown error');
          continue; // Try next URL
        }
      }
      
      // If all URLs fail, return null summary
      return {
        summary: null,
        source: urls[0],
        success: false
      };
    };

    // Get summaries for both cities in parallel
    const [currentSummary, desiredSummary] = await Promise.all([
      getSummaryForCity(currentCityUrls),
      getSummaryForCity(desiredCityUrls)
    ]);

    return {
      current: currentSummary,
      desired: desiredSummary
    };
  } catch (error: any) {
    console.error('Error in content summaries:', error?.message || 'Unknown error');
    return null;
  }
}