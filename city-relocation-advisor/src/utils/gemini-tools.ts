import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import * as apiIntegrations from './api-integrations';
import { canMakeRequest, registerRequest, handleRateLimitError, getWaitTime } from './rate-limiter';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check for required API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set. Please set it in your .env file.');
}

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Define the model to use
const MODEL_NAME = 'gemini-1.5-pro';

// Define the safety settings
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

/**
 * Get data from Radar API
 */
export async function getRadarDataTool(params: any) {
  console.log('🔧 Gemini tool called: getRadarData', params);
  
  try {
    // Check rate limiting
    if (!canMakeRequest(MODEL_NAME)) {
      const waitTime = getWaitTime(MODEL_NAME);
      return { error: `Rate limit exceeded. Please wait ${waitTime}ms before trying again.` };
    }
    
    // Register the request
    registerRequest(MODEL_NAME);
    
    // Call the Radar API
    const result = await apiIntegrations.getRadarData(params);
    return result;
  } catch (error) {
    console.error('❌ Error in getRadarDataTool:', error);
    return { error: 'Failed to get Radar data', details: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get data from Serper API
 */
export async function getSerperDataTool(query: string, options: any = {}) {
  console.log('🔧 Gemini tool called: getSerperData', { query, options });
  
  try {
    // Check rate limiting
    if (!canMakeRequest(MODEL_NAME)) {
      const waitTime = getWaitTime(MODEL_NAME);
      return { error: `Rate limit exceeded. Please wait ${waitTime}ms before trying again.` };
    }
    
    // Register the request
    registerRequest(MODEL_NAME);
    
    // Call the Serper API
    const result = await apiIntegrations.getSerperData(query, options);
    return result;
  } catch (error) {
    console.error('❌ Error in getSerperDataTool:', error);
    return { error: 'Failed to get Serper data', details: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get data from News API
 */
export async function getNewsDataTool(query: string, options: any = {}) {
  console.log('🔧 Gemini tool called: getNewsData', { query, options });
  
  try {
    // Check rate limiting
    if (!canMakeRequest(MODEL_NAME)) {
      const waitTime = getWaitTime(MODEL_NAME);
      return { error: `Rate limit exceeded. Please wait ${waitTime}ms before trying again.` };
    }
    
    // Register the request
    registerRequest(MODEL_NAME);
    
    // Call the News API
    const result = await apiIntegrations.getNewsData(query, options);
    return result;
  } catch (error) {
    console.error('❌ Error in getNewsDataTool:', error);
    return { error: 'Failed to get News data', details: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get all data for a city
 */
export async function getAllCityDataTool(cityName: string) {
  console.log('🔧 Gemini tool called: getAllCityData', { cityName });
  
  try {
    // Check rate limiting
    if (!canMakeRequest(MODEL_NAME)) {
      const waitTime = getWaitTime(MODEL_NAME);
      return { error: `Rate limit exceeded. Please wait ${waitTime}ms before trying again.` };
    }
    
    // Register the request
    registerRequest(MODEL_NAME);
    
    // Call the getAllCityData function
    const result = await apiIntegrations.getAllCityData(cityName);
    return result;
  } catch (error) {
    console.error('❌ Error in getAllCityDataTool:', error);
    return { error: 'Failed to get city data', details: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get cached data for a city
 */
export async function getCachedCityDataTool(cityName: string) {
  console.log('🔧 Gemini tool called: getCachedCityData', { cityName });
  
  try {
    // Get the cached data
    const result = apiIntegrations.getCachedCityData(cityName);
    return result || { error: 'No cached data found for this city' };
  } catch (error) {
    console.error('❌ Error in getCachedCityDataTool:', error);
    return { error: 'Failed to get cached city data', details: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate a response using Gemini
 */
export async function generateResponseWithGemini(
  prompt: string,
  context: any = {},
  tools: any[] = []
) {
  console.log('🧠 Generating response with Gemini');
  console.log('Prompt:', prompt);
  console.log('Context:', JSON.stringify(context));
  console.log('Tools:', JSON.stringify(tools));
  
  try {
    // Check rate limiting
    if (!canMakeRequest(MODEL_NAME)) {
      const waitTime = getWaitTime(MODEL_NAME);
      console.log('Rate limit exceeded, wait time:', waitTime);
      return { error: `Rate limit exceeded. Please wait ${waitTime}ms before trying again.` };
    }
    
    // Register the request
    registerRequest(MODEL_NAME);
    
    // Get the model
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      safetySettings
    });
    
    // Create a system prompt with context
    let systemPrompt = '';
    if (Object.keys(context).length > 0) {
      systemPrompt = `Context: ${JSON.stringify(context)}\n\n`;
    }
    
    // Add tools information to the prompt if tools are provided
    if (tools.length > 0) {
      systemPrompt += `Available tools: ${JSON.stringify(tools)}\n\n`;
    }
    
    // Combine system prompt with user prompt
    const fullPrompt = systemPrompt + prompt;
    console.log('Full prompt:', fullPrompt);
    
    // Generate a response
    console.log('Sending request to Gemini API...');
    const result = await model.generateContent(fullPrompt);
    console.log('Received response from Gemini API');
    
    const response = await result.response;
    const text = response.text();
    console.log('Generated text:', text);
    
    // Return a properly formatted response
    return { 
      text,
      success: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error generating response with Gemini:', error);
    
    // Handle rate limit errors
    if (error instanceof Error && error.message.includes('quota')) {
      handleRateLimitError(MODEL_NAME);
      return { 
        error: 'Rate limit exceeded for Gemini API. Please try again later.',
        success: false,
        timestamp: new Date().toISOString()
      };
    }
    
    return { 
      error: 'Failed to generate response', 
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Define the tools for Gemini to use
 */
export const geminiTools = [
  {
    name: 'getRadarData',
    description: 'Get data from Radar API for location-based information',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'The type of Radar API request (geofence, search, geocode)',
          enum: ['geofence', 'search', 'geocode']
        },
        query: {
          type: 'string',
          description: 'The query for geocoding (required for geocode type)'
        },
        latitude: {
          type: 'number',
          description: 'The latitude for geofence or search (required for geofence and search types)'
        },
        longitude: {
          type: 'number',
          description: 'The longitude for geofence or search (required for geofence and search types)'
        },
        radius: {
          type: 'number',
          description: 'The radius in meters for geofence or search (required for geofence and search types)'
        },
        categories: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'The categories for search (optional for search type)'
        },
        limit: {
          type: 'number',
          description: 'The limit for search (optional for search type)'
        }
      },
      required: ['type']
    }
  },
  {
    name: 'getSerperData',
    description: 'Get data from Serper API for web search results',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query'
        },
        options: {
          type: 'object',
          description: 'Additional options for the search'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'getNewsData',
    description: 'Get data from News API for news articles',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query'
        },
        options: {
          type: 'object',
          description: 'Additional options for the search'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'getAllCityData',
    description: 'Get all data for a city from multiple APIs',
    parameters: {
      type: 'object',
      properties: {
        cityName: {
          type: 'string',
          description: 'The name of the city'
        }
      },
      required: ['cityName']
    }
  },
  {
    name: 'getCachedCityData',
    description: 'Get cached data for a city if available',
    parameters: {
      type: 'object',
      properties: {
        cityName: {
          type: 'string',
          description: 'The name of the city'
        }
      },
      required: ['cityName']
    }
  }
]; 