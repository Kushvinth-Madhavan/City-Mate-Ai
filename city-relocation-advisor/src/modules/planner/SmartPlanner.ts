import { GoogleGenerativeAI } from '@google/generative-ai';
import { MemoryManager } from '@/utils/memory';
import { QueryContext } from '@/types';

// Define the tool interface
export interface Tool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  input: TInput;
  run: (input: TInput) => Promise<TOutput>;
  fallback?: (input: TInput) => Promise<TOutput>;
}

// Define the plan structure
export interface ExecutionPlan {
  task: string;
  tools: Array<{
    tool: string;
    input: any;
  }>;
}

export class SmartPlanner {
  private genAI: GoogleGenerativeAI;
  private memoryManager: MemoryManager;
  private tools: Record<string, Tool>;

  constructor(userId: string) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.memoryManager = new MemoryManager(userId);
    this.tools = this.initializeTools();
  }

  private initializeTools(): Record<string, Tool> {
    return {
      getCityInfo: {
        name: 'getCityInfo',
        description: 'Get basic information about a city',
        input: { city: '' },
        run: async (input) => {
          // Implementation will be added
          return {};
        }
      },
      getHousingMarketData: {
        name: 'getHousingMarketData',
        description: 'Get housing market data for a city',
        input: { city: '' },
        run: async (input) => {
          // Implementation will be added
          return {};
        }
      },
      getJobOpportunitiesData: {
        name: 'getJobOpportunitiesData',
        description: 'Get job opportunities data for a city',
        input: { city: '', field: '' },
        run: async (input) => {
          // Implementation will be added
          return {};
        }
      },
      getNewsAboutCity: {
        name: 'getNewsAboutCity',
        description: 'Get recent news about a city',
        input: { city: '' },
        run: async (input) => {
          // Implementation will be added
          return {};
        }
      },
      getNeighborhoodInfo: {
        name: 'getNeighborhoodInfo',
        description: 'Get neighborhood information for a city',
        input: { city: '' },
        run: async (input) => {
          // Implementation will be added
          return {};
        }
      },
      compareCostOfLiving: {
        name: 'compareCostOfLiving',
        description: 'Compare cost of living between two cities',
        input: { cityA: '', cityB: '' },
        run: async (input) => {
          // Implementation will be added
          return {};
        }
      }
    };
  }

  private async getContextFromMemory(context: QueryContext): Promise<string> {
    const userProfile = await this.memoryManager.getUserProfile();
    const conversationHistory = await this.memoryManager.getConversationHistory();
    const cityPreferences = await this.memoryManager.getCityPreferences();

    return JSON.stringify({
      userProfile,
      recentConversations: conversationHistory.slice(-5),
      cityPreferences
    });
  }

  private createPrompt(query: string, context: string): string {
    return `You are a city relocation advisor. Create a structured plan to answer the user's query.

Available tools:
${Object.values(this.tools).map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

User context:
${context}

User query: "${query}"

Create a JSON plan with this structure:
{
  "task": "Brief description of the task",
  "tools": [
    { "tool": "toolName", "input": { "param1": "value1" } }
  ]
}

Return only the JSON plan.`;
  }

  public async createPlan(query: string, context: QueryContext): Promise<ExecutionPlan> {
    try {
      // Get context from memory
      const memoryContext = await this.getContextFromMemory(context);
      
      // Create the prompt
      const prompt = this.createPrompt(query, memoryContext);
      
      // Get the model
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      
      // Generate the plan
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the JSON plan
      try {
        const plan = JSON.parse(text) as ExecutionPlan;
        
        // Validate the plan
        if (!plan.task || !Array.isArray(plan.tools)) {
          throw new Error('Invalid plan structure');
        }
        
        // Validate each tool
        for (const tool of plan.tools) {
          if (!this.tools[tool.tool]) {
            throw new Error(`Unknown tool: ${tool.tool}`);
          }
        }
        
        return plan;
      } catch (error) {
        console.error('Error parsing plan:', error);
        throw new Error('Failed to parse plan');
      }
    } catch (error) {
      console.error('Error creating plan:', error);
      throw error;
    }
  }

  public async executePlan(plan: ExecutionPlan): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    for (const tool of plan.tools) {
      try {
        const toolImpl = this.tools[tool.tool];
        if (!toolImpl) {
          throw new Error(`Unknown tool: ${tool.tool}`);
        }
        
        // Try the primary implementation
        try {
          results[tool.tool] = await toolImpl.run(tool.input);
        } catch (error) {
          console.warn(`Primary implementation failed for ${tool.tool}, trying fallback`);
          
          // Try the fallback if available
          if (toolImpl.fallback) {
            results[tool.tool] = await toolImpl.fallback(tool.input);
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error(`Error executing tool ${tool.tool}:`, error);
        results[tool.tool] = { error: `Failed to execute ${tool.tool}` };
      }
    }
    
    return results;
  }
} 