import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  canMakeRequest, 
  registerRequest, 
  handleRateLimitError, 
  getWaitTime,
  extractRetryDelay
} from './rate-limiter';

// Validate required environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize the Google Generative AI client
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Function to generate embeddings using Google's Gemini with rate limiting
export async function getGeminiEmbedding(text: string): Promise<number[]> {
  const MODEL_NAME = "embedding-001";
  
  try {
    if (!genAI) {
      throw new Error('Gemini API client not initialized due to missing API key');
    }
    
    // Check if we can make a request or need to wait
    if (!canMakeRequest(MODEL_NAME)) {
      const waitTime = getWaitTime(MODEL_NAME);
      console.log(`Rate limit active for ${MODEL_NAME}. Waiting ${Math.ceil(waitTime/1000)} seconds...`);
      
      // Wait for the rate limit to reset
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    console.log('Generating embedding for text:', text.substring(0, 50) + '...');
    const embeddingModel = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Register this request with the rate limiter
    registerRequest(MODEL_NAME);
    
    // Make the API call
    const result = await embeddingModel.embedContent(text);
    console.log('Successfully generated embedding with dimensions:', result.embedding.values.length);
    return result.embedding.values;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error generating Gemini embedding: ${errorMessage}`);
    
    // Check if it's a rate limit error and handle it
    if (error instanceof Error && errorMessage.includes('quota')) {
      const retryDelay = extractRetryDelay(error);
      console.warn(`Quota exceeded for ${MODEL_NAME}. Backing off for ${retryDelay} seconds.`);
      handleRateLimitError(MODEL_NAME, retryDelay);
    }
    
    throw error;
  }
}

// Default embedding function that only uses Gemini
export async function generateEmbedding(text: string): Promise<number[]> {
  return await getGeminiEmbedding(text);
} 