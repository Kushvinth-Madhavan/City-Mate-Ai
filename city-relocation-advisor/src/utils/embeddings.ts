import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Function to generate embeddings using Google's Gemini
export async function getGeminiEmbedding(text: string): Promise<number[]> {
  try {
    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating Gemini embedding:', error);
    throw error;
  }
}

// Default embedding function that uses Gemini only
export async function generateEmbedding(text: string): Promise<number[]> {
  return await getGeminiEmbedding(text);
} 