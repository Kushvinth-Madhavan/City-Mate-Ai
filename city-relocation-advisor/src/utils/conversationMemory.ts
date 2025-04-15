import { generateEmbedding } from './embedding';

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  embedding?: number[];
  timestamp: number;
}

interface ConversationContext {
  userId: string;
  turns: ConversationTurn[];
  cityContext: {
    currentLocation?: string;
    desiredLocation?: string;
    preferences?: Record<string, any>;
  };
}

// In-memory store for active conversations (in production, use Redis or similar)
const conversationStore = new Map<string, ConversationContext>();

export class ConversationMemory {
  static async addTurn(
    userId: string, 
    role: 'user' | 'assistant', 
    content: string,
    cityContext?: { currentLocation?: string; desiredLocation?: string; }
  ): Promise<void> {
    let context = conversationStore.get(userId);
    
    if (!context) {
      context = {
        userId,
        turns: [],
        cityContext: {}
      };
      conversationStore.set(userId, context);
    }

    // Update city context if provided
    if (cityContext) {
      context.cityContext = {
        ...context.cityContext,
        ...cityContext
      };
    }

    // Generate embedding for the new message
    const embedding = await generateEmbedding(content);

    // Add the new turn
    context.turns.push({
      role,
      content,
      embedding,
      timestamp: Date.now()
    });

    // Keep only last 10 turns to manage memory
    if (context.turns.length > 10) {
      context.turns = context.turns.slice(-10);
    }
  }

  static async getRelevantContext(userId: string, currentMessage: string): Promise<string> {
    const context = conversationStore.get(userId);
    if (!context || context.turns.length === 0) {
      return '';
    }

    // Generate embedding for current message
    const currentEmbedding = await generateEmbedding(currentMessage);

    // Calculate similarity with previous turns
    const similarities = await Promise.all(
      context.turns.map(turn => ({
        turn,
        similarity: calculateCosineSimilarity(currentEmbedding, turn.embedding!)
      }))
    );

    // Get most relevant turns (similarity > 0.7)
    const relevantTurns = similarities
      .filter(({ similarity }) => similarity > 0.7)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map(({ turn }) => turn);

    // Format relevant context
    return relevantTurns
      .map(turn => `${turn.role}: ${turn.content}`)
      .join('\n');
  }

  static getCityContext(userId: string): { currentLocation?: string; desiredLocation?: string; } {
    return conversationStore.get(userId)?.cityContext || {};
  }
}

// Utility function to calculate cosine similarity between embeddings
function calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
  const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
  const norm1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
  const norm2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (norm1 * norm2);
} 