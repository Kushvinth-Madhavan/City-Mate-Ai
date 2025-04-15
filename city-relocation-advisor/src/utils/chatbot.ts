import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { MemoryManager, UserProfile, extractCityPreferences, getUserProfile, updateUserProfile, CityData } from './memory';
import * as apiTools from './api-tools';
import * as apiIntegrations from './api-integrations';
import * as crypto from 'crypto';
import { 
  canMakeRequest, 
  registerRequest, 
  handleRateLimitError, 
  getWaitTime 
} from './rate-limiter';
import { processUserQuery } from './APIOrchestrator';
import { ApiResponse, QueryContext, QueryProcessingOptions } from '../types';

// Import our new modular architecture
import { 
  IntentParser,
  APIOrchestrator,
  DataFusionEngine,
  ReasoningEngine,
  ResponseGenerator
} from '../modules';

// Import the new functions
import { searchGoogle, executeInParallel } from './api-tools';

// Define local type definitions
export type UserCityPreference = {
  name: string;
  interestLevel: 'low' | 'medium' | 'high';
  firstMentionedAt: Date;
  lastMentionedAt: Date;
};

export type FormattedResponse = {
  text: string;
  html: string;
  maps?: string[];
  images?: string[];
  webResults?: Array<{ title: string; link: string; snippet: string }>;
  newsLinks?: Array<{ title: string; link: string; source: string }>;
  raw?: any;
};

// Define message types
export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt?: Date;
  toolCall?: {
    name: string;
    arguments: any;
  };
  toolResult?: any;
};

// Generate a unique ID for the message
function generateMessageId(): string {
  return crypto.randomUUID();
}

// Create an instance of the MemoryManager
const memoryManager = new MemoryManager('system');

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Define the maximum number of messages to keep in history
const MAX_HISTORY_LENGTH = 10;

// Define the rate limit for the chatbot
const CHATBOT_RATE_LIMIT = {
  requestsPerMinute: 30,
  requestsPerHour: 300,
  requestsPerDay: 3000
};

// Track user conversations
const userConversations: Record<string, {
  history: Array<{ role: 'user' | 'assistant', content: string }>,
  lastRequest: number,
  cityPreferences: string[]
}> = {};

/**
 * Process a message from a user
 */
export async function processMessage(
  message: string,
  userId: string,
  options: QueryProcessingOptions = {}
): Promise<ApiResponse> {
  console.log('📝 Processing message:', message);
  console.log('User ID:', userId);
  console.log('Options:', JSON.stringify(options));
  
  try {
    // Get user profile
    const userProfile = getUserProfile(userId) as UserProfile;
    const history = userProfile.conversationHistory || [];
    console.log('User profile:', JSON.stringify(userProfile));

    // Prepare context for API orchestrator
    const context: QueryContext = {
      userId,
      history,
      cityPreferences: userProfile.cityPreferences.map(p => p.city)
    };
    console.log('Context for API orchestrator:', JSON.stringify(context));

    // Parse intent
    const parsedIntent = await IntentParser.parse(message);
    console.log('Parsed intent:', JSON.stringify(parsedIntent));

    // Process the query with the API orchestrator
    console.log('Fetching data from APIs...');
    const apiResults = await APIOrchestrator.fetch(parsedIntent);
    console.log('API results received');

    // Merge and process data
    console.log('Merging and processing data...');
    const fusedData = DataFusionEngine.merge(parsedIntent, apiResults);
    console.log('Data fusion complete');

    // Generate reasoning and response
    console.log('Generating response with reasoning...');
    const reasoningOutput = await ReasoningEngine.generate(parsedIntent, fusedData);
    console.log('Response generation complete');

    // Format the response
    console.log('Formatting final response...');
    const formattedResponse = ResponseGenerator.format(reasoningOutput, fusedData, parsedIntent);
    console.log('Response formatting complete');

    // Update conversation history
    const updatedHistory = [
      ...history,
      { role: 'user' as const, content: message },
      { role: 'assistant' as const, content: formattedResponse.text }
    ];

    // Store the updated history in memory
    const updatedProfile = {
      ...userProfile,
      conversationHistory: updatedHistory,
      lastUpdated: Date.now()
    };
    updateUserProfile(userId, updatedProfile);

    // Return the response
    return {
      text: formattedResponse.text,
      success: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error processing message:', error);
    return {
      text: 'I apologize, but I encountered an error while processing your request. Please try again later.',
      success: false,
      timestamp: new Date().toISOString()
    };
  }
}

// Helper function to extract search queries from a message
function extractSearchQueries(message: string): string[] {
  const queries: string[] = [];
  
  // Extract city names
  const cityMatches = message.match(/\b(?:in|to|from|at|near|around)\s+([A-Z][a-zA-Z\s,]+)(?:\s|$)/g);
  if (cityMatches) {
    cityMatches.forEach(match => {
      const city = match.replace(/\b(?:in|to|from|at|near|around)\s+/g, '').trim();
      queries.push(`${city} city information cost of living quality of life`);
    });
  }
  
  // Extract specific topics
  const topics = [
    'housing market',
    'job opportunities',
    'schools',
    'crime rate',
    'cost of living',
    'public transportation',
    'healthcare',
    'weather',
    'culture',
    'nightlife'
  ];
  
  topics.forEach(topic => {
    if (message.toLowerCase().includes(topic)) {
      queries.push(`${topic} ${message.split(' ').slice(-3).join(' ')}`);
    }
  });
  
  return queries;
}

/**
 * Get conversation history for a user
 */
export function getConversationHistory(userId: string) {
  return userConversations[userId]?.history || [];
}

/**
 * Get city preferences for a user
 */
export function getCityPreferences(userId: string) {
  return userConversations[userId]?.cityPreferences || [];
}

/**
 * Clear conversation history for a user
 */
export function clearConversationHistory(userId: string) {
  if (userConversations[userId]) {
    userConversations[userId].history = [];
  }
}

/**
 * Get all user conversations
 */
export function getAllConversations() {
  return Object.keys(userConversations).map(userId => ({
    userId,
    historyLength: userConversations[userId].history.length,
    lastRequest: userConversations[userId].lastRequest,
    cityPreferences: userConversations[userId].cityPreferences
  }));
}

/**
 * Process a user message and generate a response
 */
export async function processMessageOld(
  userId: string,
  messages: Message[],
  currentMessage: string
): Promise<Message> {
  console.log(`\n🧠 Processing message for user ${userId}: "${currentMessage}"`);
  
  // Check rate limiting
  if (!canMakeRequest(userId)) {
    const waitTime = getWaitTime(userId);
    console.log(`⏱️ Rate limit exceeded for user ${userId}. Wait time: ${waitTime}ms`);
    return {
      id: generateMessageId(),
      role: 'assistant',
      content: `I'm receiving too many requests right now. Please wait a moment and try again.`,
      createdAt: new Date()
    };
  }
  
  // Register the request
  registerRequest(userId);
  
  try {
    // Get or create memory manager for this user
    const memoryManager = new MemoryManager(userId);
    
    // Get user profile
    let userProfile = await memoryManager.getUserProfile();
    if (!userProfile) {
      userProfile = {};
      await memoryManager.storeUserProfile(userProfile);
    }
    
    // Get conversation history
    let conversationHistory = await memoryManager.getConversationHistory();
    if (!conversationHistory) {
      conversationHistory = [];
    }
    
    // Get city preferences
    let cityPreferences = await memoryManager.getCityPreferences();
    if (!cityPreferences) {
      cityPreferences = [];
    }
    
    // Add the new message to the conversation
    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: currentMessage,
      createdAt: new Date()
    };
    
    // Process the message using our modular architecture
    const response = await processUserQuery(currentMessage, {
      userId,
      history: messages.filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      cityPreferences: userProfile.cityPreferences.map(p => p.city)
    }, {
      useCache: true
    }) as { text: string };
    
    // Create the assistant message
    const assistantMessage: Message = {
      id: generateMessageId(),
      role: 'assistant',
      content: response.text,
      createdAt: new Date()
    };
    
    // Update the conversation history
    conversationHistory.push(userMessage, assistantMessage);
    await memoryManager.storeConversationHistory(conversationHistory);
    
    // Update user profile and city preferences based on the conversation
    await updateUserProfileFromMessage(userProfile, currentMessage, response.text);
    await memoryManager.storeUserProfile(userProfile);
    
    // Extract city preferences from the conversation
    // Extract city names from the current message
    const cityNames = extractCityPreferences(currentMessage);
    if (cityNames.length > 0) {
      // Convert string[] to CityData[]
      const cityDataArray: CityData[] = cityNames.map(name => ({
        name,
        discussed: true,
        interested: true
      }));
      await memoryManager.storeCityPreferences(cityDataArray);
    }
    
    // Return the assistant message
    return assistantMessage;
  } catch (error) {
    console.error('❌ Error processing message:', error);
    
    // Handle rate limit errors
    if (error instanceof Error && error.message.includes('rate limit')) {
      handleRateLimitError(userId);
      const waitTime = getWaitTime(userId);
      return {
        id: generateMessageId(),
        role: 'assistant',
        content: `I'm receiving too many requests right now. Please wait a moment and try again.`,
        createdAt: new Date()
      };
    }
    
    // Return a generic error message
    return {
      id: generateMessageId(),
      role: 'assistant',
      content: `I apologize, but I encountered an error while processing your request. Please try again later.`,
      createdAt: new Date()
    };
  }
}

/**
 * Update user profile based on conversation
 */
async function updateUserProfileFromMessage(
  userProfile: UserProfile,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  try {
    // Use the IntentParser to extract city information and preferences
    const parsedIntent = await IntentParser.parse(userMessage);
    
    // Update user preferences based on parsed intent
    if (parsedIntent.preferences) {
      userProfile.preferences = {
        ...userProfile.preferences,
        ...parsedIntent.preferences
      };
    }
    
    // Update cities of interest
    if (parsedIntent.locations.cities && parsedIntent.locations.cities.length > 0) {
      // Initialize cities array if it doesn't exist
      if (!userProfile.cities) {
        userProfile.cities = [];
      }
      
      // Add cities to the user's profile if they don't exist
      for (const cityName of parsedIntent.locations.cities) {
        const existingCity = userProfile.cities.find(
          (city: UserCityPreference) => city.name.toLowerCase() === cityName.toLowerCase()
        );
        
        if (!existingCity) {
          userProfile.cities.push({
            name: cityName,
            interestLevel: 'medium',
            firstMentionedAt: new Date(),
            lastMentionedAt: new Date()
          });
        } else {
          // Update the last mentioned time
          existingCity.lastMentionedAt = new Date();
          
          // Increase interest level if the user is asking detailed questions
          if (
            parsedIntent.intent === 'HOUSING_MARKET' || 
            parsedIntent.intent === 'NEIGHBORHOOD_RECOMMENDATION' ||
            parsedIntent.intent === 'JOB_OPPORTUNITIES'
          ) {
            existingCity.interestLevel = 'high';
          }
        }
      }
    }
    
    // Update the profile's last updated timestamp
    userProfile.updatedAt = new Date();
  } catch (error) {
    console.error('Error updating user profile:', error);
  }
} 