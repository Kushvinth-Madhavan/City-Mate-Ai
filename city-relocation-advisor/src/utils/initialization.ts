import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { supabaseAdmin as supabase, ensureVectorStoreExists } from './supabase';
import { setMemoryOnlyMode } from './memory';
import { withRetry } from './api-tools';

interface APIStatus {
  gemini: boolean;
  radar: boolean;
  serper: boolean;
  newsApi: boolean;
  jinaReader: boolean;
  supabase: boolean;
  memoryOnly: boolean;
  proxy: {
    enabled: boolean;
    url: string | null;
  };
}

// Main function to verify API connections
export async function verifyApiConnections(): Promise<APIStatus> {
  console.log('🔍 Verifying API connections...');
  const status: APIStatus = {
    gemini: false,
    radar: false,
    serper: false,
    newsApi: false,
    jinaReader: false,
    supabase: false,
    memoryOnly: false,
    proxy: {
      enabled: process.env.USE_PROXY === 'true',
      url: process.env.PROXY_URL || null
    }
  };

  // Check if proxy is configured
  if (status.proxy.enabled) {
    console.log(`🔒 Proxy enabled: ${status.proxy.url}`);
  } else {
    console.log('ℹ️ No proxy configured');
  }

  // Check Gemini API
  try {
    console.log('🔍 Checking Gemini API...');
    await withRetry(async () => {
      if (!process.env.GOOGLE_API_KEY) {
        throw new Error('Gemini API key is missing');
      }
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent("Hello!");
      const response = await result.response;
      const text = response.text();
      console.log('✅ Gemini API is working');
      status.gemini = true;
    }, { retries: 1, delay: 1000, apiName: 'Gemini API' });
  } catch (error) {
    console.error('❌ Gemini API error:', error);
  }

  // Check Radar API
  try {
    if (!process.env.RADAR_API_KEY) {
      console.error('❌ Radar API key is missing in environment variables');
    } else {
      console.log('🔄 Testing Radar API connection...');
      await axios.get('https://api.radar.io/v1/geocode/forward', {
        params: { query: 'San Francisco' },
        headers: { 'Authorization': `${process.env.RADAR_API_KEY}` }
      });
      status.radar = true;
      console.log('✅ Radar API connection successful');
    }
  } catch (error) {
    let errorMsg = 'Unknown error';
    if (axios.isAxiosError(error) && error.response) {
      errorMsg = `Status: ${error.response.status}, Message: ${JSON.stringify(error.response.data)}`;
    } else if (error instanceof Error) {
      errorMsg = error.message;
    }
    console.error(`❌ Error connecting to Radar API: ${errorMsg}`);
  }

  // Check Serper API
  try {
    if (!process.env.SERPER_API_KEY) {
      console.error('❌ Serper API key is missing in environment variables');
    } else {
      console.log('🔄 Testing Serper API connection...');
      await axios.post(
        'https://google.serper.dev/search',
        { q: 'test' },
        { headers: { 'X-API-KEY': process.env.SERPER_API_KEY } }
      );
      status.serper = true;
      console.log('✅ Serper API connection successful');
    }
  } catch (error) {
    let errorMsg = 'Unknown error';
    if (axios.isAxiosError(error) && error.response) {
      errorMsg = `Status: ${error.response.status}, Message: ${JSON.stringify(error.response.data)}`;
    } else if (error instanceof Error) {
      errorMsg = error.message;
    }
    console.error(`❌ Error connecting to Serper API: ${errorMsg}`);
  }

  // Check News API
  try {
    if (!process.env.NEWS_API_KEY) {
      console.error('❌ News API key is missing in environment variables');
    } else {
      console.log('🔄 Testing News API connection...');
      await axios.get('https://newsapi.org/v2/everything', {
        params: { q: 'test', pageSize: 1 },
        headers: { 'X-Api-Key': process.env.NEWS_API_KEY }
      });
      status.newsApi = true;
      console.log('✅ News API connection successful');
    }
  } catch (error) {
    let errorMsg = 'Unknown error';
    if (axios.isAxiosError(error) && error.response) {
      errorMsg = `Status: ${error.response.status}, Message: ${JSON.stringify(error.response.data)}`;
    } else if (error instanceof Error) {
      errorMsg = error.message;
    }
    console.error(`❌ Error connecting to News API: ${errorMsg}`);
  }

  // Check Jina Reader API
  try {
    if (!process.env.JINA_API_KEY) {
      console.error('❌ Jina Reader API key is missing in environment variables');
    } else {
      console.log('🔄 Testing Jina Reader API connection...');
      await axios.post(
        'https://reader.jina.ai/api/ping',
        {},
        { headers: { 'Authorization': `Bearer ${process.env.JINA_API_KEY}` } }
      );
      status.jinaReader = true;
      console.log('✅ Jina Reader API connection successful');
    }
  } catch (error) {
    let errorMsg = 'Unknown error';
    if (axios.isAxiosError(error) && error.response) {
      errorMsg = `Status: ${error.response.status}, Message: ${JSON.stringify(error.response.data)}`;
    } else if (error instanceof Error) {
      errorMsg = error.message;
    }
    console.error(`❌ Error connecting to Jina Reader API: ${errorMsg}`);
  }

  // Check Supabase with retry and better error handling
  try {
    console.log('🔍 Checking Supabase database connection...');
    await withRetry(async () => {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        throw new Error('Supabase credentials are missing');
      }
      
      // Set memory-only mode to false initially
      setMemoryOnlyMode(false);
      
      // Try to create tables if they don't exist
      await ensureVectorStoreExists();
      
      // Test table access
      try {
        // Test access to user_profile table
        const supabaseClient = supabase;
        if (!supabaseClient) {
          throw new Error('Supabase client not initialized');
        }
        
        const { data, error } = await supabaseClient.from('user_profile').select('id').limit(1);
        if (error) {
          console.error('❌ Error accessing user_profile table:', error);
          throw error;
        }
        console.log('✅ Successfully accessed user_profile table');
        status.supabase = true;
      } catch (tableError) {
        console.error('❌ Error accessing tables:', tableError);
        throw tableError;
      }
    }, { retries: 2, delay: 2000, apiName: 'Supabase' });
  } catch (error) {
    console.error('❌ Supabase connection error. Switching to memory-only mode:', error);
    setMemoryOnlyMode(true);
    status.memoryOnly = true;
  }

  console.log('📋 API verification completed');
  return status;
}

// Function to check if essential APIs are available
export function areEssentialApisAvailable(status: APIStatus): boolean {
  // Gemini is the only absolutely essential API for the app to function
  return status.gemini;
}

// Initialize API connections on app startup
export async function initializeApp() {
  console.log('🚀 Initializing application...');
  
  // First check network connectivity
  const networkAvailable = await checkNetworkConnectivity();
  
  // If network is down, immediately go to memory-only mode
  if (!networkAvailable) {
    console.error('❌ Network connectivity issues detected. Switching to memory-only mode...');
    setMemoryOnlyMode(true);
    return {
      success: false,
      memoryOnly: true,
      message: "Application initialized in offline mode due to network connectivity issues.",
      apiStatus: {
        gemini: false,
        radar: false,
        serper: false,
        newsApi: false,
        jinaReader: false,
        supabase: false,
        memoryOnly: true,
        proxy: {
          enabled: process.env.USE_PROXY === 'true',
          url: process.env.PROXY_URL || null
        }
      }
    };
  }
  
  // If network is available, verify all API connections
  const apiStatus = await verifyApiConnections();
  
  // Check for essential APIs
  const essentialApisAvailable = apiStatus.gemini; // Consider only Gemini as essential
  
  if (!essentialApisAvailable) {
    console.error('❌ Essential APIs unavailable. Application may not function correctly.');
    return {
      success: false,
      memoryOnly: apiStatus.memoryOnly,
      message: "Application initialized with limited functionality due to missing essential APIs.",
      apiStatus
    };
  }
  
  // If using memory-only mode, log clearly
  if (apiStatus.memoryOnly) {
    console.log('ℹ️ Application initialized in memory-only mode. User data will not persist between sessions.');
  } else {
    console.log('✅ Application initialized with database connectivity. User data will persist.');
  }
  
  console.log('📊 API Status:', JSON.stringify(apiStatus, null, 2));
  
  return {
    success: true,
    memoryOnly: apiStatus.memoryOnly,
    message: "Application initialized successfully.",
    apiStatus
  };
}

// Add a function to check network connectivity
export async function checkNetworkConnectivity(): Promise<boolean> {
  console.log('🔍 Checking network connectivity...');
  
  try {
    // Try to reach multiple common endpoints to verify network connection
    const endpoints = [
      'https://www.google.com',
      'https://www.cloudflare.com',
      'https://www.github.com'
    ];
    
    // Try each endpoint until one succeeds
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint, { 
          timeout: 5000,
          // Only need headers, not the full response body
          validateStatus: (status) => status >= 200 && status < 500 
        });
        
        console.log(`✅ Network connectivity confirmed via ${endpoint}`);
        return true;
      } catch (err) {
        console.log(`⚠️ Failed to connect to ${endpoint}`);
        // Continue to next endpoint
      }
    }
    
    // If all endpoints failed, network is likely down
    console.error('❌ Network connectivity check failed for all endpoints');
    return false;
  } catch (error) {
    console.error('❌ Error checking network connectivity:', error);
    return false;
  }
} 