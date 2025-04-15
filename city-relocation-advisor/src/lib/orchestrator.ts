import { APIOrchestrator } from '@/modules/orchestration/APIOrchestrator';
import { ParsedIntent, QueryIntent, UserPreferences } from '@/modules/intent/IntentParser';
import { Groq } from 'groq-sdk';
import { Document } from '@langchain/core/documents';
import { RateLimiter } from '@/utils/RateLimiter';

// Initialize Groq client with API key from environment variables
const groqApiKey = process.env.GROQ_API_KEY;
let groq: Groq | null = null;

if (!groqApiKey) {
  console.error('❌ GROQ_API_KEY environment variable is missing. Please add it to your .env file.');
  console.warn('⚠️ Groq LLM features will be disabled. Using fallback summarization.');
} else {
  groq = new Groq({
    apiKey: groqApiKey,
  });
}

// Initialize rate limiter
const rateLimiter = new RateLimiter();

export interface RelocationAnalysis {
  currentLocation: {
    name: string;
    coordinates?: [number, number];
  };
  desiredLocation: {
    name: string;
    coordinates?: [number, number];
  };
  analysis: {
    costOfLiving: any;
    qualityOfLife: any;
    jobMarket: any;
    housingMarket: any;
    transportation: any;
    neighborhoods: any;
    recentNews: any[];
  };
  summary: string;
  recommendations: string[];
}

export class RelocationOrchestrator {
  /**
   * Main orchestrator function that handles the entire relocation analysis process
   */
  static async analyzeRelocation(
    currentLocation: string,
    desiredLocation: string,
    userPreferences?: Record<string, any>
  ): Promise<RelocationAnalysis> {
    console.log('🔄 Starting relocation analysis...');
    
    // Create a parsed intent for the API orchestrator
    const parsedIntent: ParsedIntent = {
      intent: QueryIntent.CITY_COMPARISON,
      locations: {
        cities: [currentLocation, desiredLocation],
      },
      preferences: userPreferences as UserPreferences || {},
      originalQuery: `Compare ${currentLocation} and ${desiredLocation} for relocation`,
      extractedKeywords: [currentLocation, desiredLocation, 'relocation', 'comparison'],
    };

    // Fetch data from all APIs in parallel
    const apiResults = await APIOrchestrator.fetch(parsedIntent);
    
    // Convert API results to LangChain documents
    const documents = this.convertToDocuments(apiResults);
    
    // Generate summary using Groq or fallback
    const summary = await this.generateSummary(documents, userPreferences);
    
    // Structure the final response
    return {
      currentLocation: {
        name: currentLocation,
        coordinates: apiResults.cityInfo?.coordinates,
      },
      desiredLocation: {
        name: desiredLocation,
        coordinates: apiResults.cityInfo?.coordinates,
      },
      analysis: {
        costOfLiving: apiResults.costOfLiving,
        qualityOfLife: apiResults.cityInfo?.qualityOfLife,
        jobMarket: apiResults.jobOpportunities,
        housingMarket: apiResults.housingMarket,
        transportation: apiResults.transportation,
        neighborhoods: apiResults.neighborhoods,
        recentNews: apiResults.news?.articles || [],
      },
      summary: summary.summary,
      recommendations: summary.recommendations,
    };
  }

  /**
   * Convert API results to LangChain documents for Groq processing
   */
  private static convertToDocuments(apiResults: any): Document[] {
    const documents: Document[] = [];
    
    // Add cost of living data
    if (apiResults.costOfLiving) {
      documents.push(new Document({
        pageContent: JSON.stringify(apiResults.costOfLiving),
        metadata: { source: 'costOfLiving' },
      }));
    }
    
    // Add quality of life data
    if (apiResults.cityInfo?.qualityOfLife) {
      documents.push(new Document({
        pageContent: JSON.stringify(apiResults.cityInfo.qualityOfLife),
        metadata: { source: 'qualityOfLife' },
      }));
    }
    
    // Add job market data
    if (apiResults.jobOpportunities) {
      documents.push(new Document({
        pageContent: JSON.stringify(apiResults.jobOpportunities),
        metadata: { source: 'jobMarket' },
      }));
    }
    
    // Add housing market data
    if (apiResults.housingMarket) {
      documents.push(new Document({
        pageContent: JSON.stringify(apiResults.housingMarket),
        metadata: { source: 'housingMarket' },
      }));
    }
    
    // Add transportation data
    if (apiResults.transportation) {
      documents.push(new Document({
        pageContent: JSON.stringify(apiResults.transportation),
        metadata: { source: 'transportation' },
      }));
    }
    
    // Add neighborhood data
    if (apiResults.neighborhoods) {
      documents.push(new Document({
        pageContent: JSON.stringify(apiResults.neighborhoods),
        metadata: { source: 'neighborhoods' },
      }));
    }
    
    // Add news data
    if (apiResults.news?.articles) {
      documents.push(new Document({
        pageContent: JSON.stringify(apiResults.news.articles),
        metadata: { source: 'news' },
      }));
    }
    
    return documents;
  }

  /**
   * Generate a summary using Groq LLM or fallback to a simpler method
   */
  private static async generateSummary(
    documents: Document[],
    userPreferences?: Record<string, any>
  ): Promise<{ summary: string; recommendations: string[] }> {
    // If Groq is available, use it
    if (groq) {
      return this.generateGroqSummary(documents, userPreferences);
    } else {
      // Fallback to a simpler summary method
      return this.generateFallbackSummary(documents, userPreferences);
    }
  }

  /**
   * Generate a summary using Groq LLM
   */
  private static async generateGroqSummary(
    documents: Document[],
    userPreferences?: Record<string, any>
  ): Promise<{ summary: string; recommendations: string[] }> {
    // Wait for rate limiter
    await rateLimiter.acquireToken();
    
    // Prepare the prompt
    const prompt = this.buildGroqPrompt(documents, userPreferences);
    
    try {
      // Call Groq API
      const completion = await groq!.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert city relocation advisor. Analyze the provided data and generate a comprehensive summary with actionable recommendations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'mixtral-8x7b-32768',
        temperature: 0.7,
        max_tokens: 2000,
      });
      
      // Parse the response
      const response = completion.choices[0]?.message?.content || '';
      
      // Split into summary and recommendations
      const [summary, recommendationsSection] = response.split('RECOMMENDATIONS:');
      const recommendations = recommendationsSection
        ? recommendationsSection
            .split('\n')
            .filter(line => line.trim().startsWith('-'))
            .map(line => line.trim().substring(2))
        : [];
      
      return {
        summary: summary.trim(),
        recommendations,
      };
    } catch (error) {
      console.error('❌ Error generating Groq summary:', error);
      return this.generateFallbackSummary(documents, userPreferences);
    }
  }

  /**
   * Generate a fallback summary when Groq is not available
   */
  private static generateFallbackSummary(
    documents: Document[],
    userPreferences?: Record<string, any>
  ): { summary: string; recommendations: string[] } {
    console.log('⚠️ Using fallback summary generation');
    
    // Extract key information from documents
    const costOfLivingDoc = documents.find(doc => doc.metadata.source === 'costOfLiving');
    const qualityOfLifeDoc = documents.find(doc => doc.metadata.source === 'qualityOfLife');
    const jobMarketDoc = documents.find(doc => doc.metadata.source === 'jobMarket');
    const housingMarketDoc = documents.find(doc => doc.metadata.source === 'housingMarket');
    const transportationDoc = documents.find(doc => doc.metadata.source === 'transportation');
    const neighborhoodsDoc = documents.find(doc => doc.metadata.source === 'neighborhoods');
    const newsDoc = documents.find(doc => doc.metadata.source === 'news');
    
    // Create a simple summary
    let summary = 'Relocation Analysis Summary:\n\n';
    
    if (costOfLivingDoc) {
      summary += '- Cost of living data is available\n';
    }
    
    if (qualityOfLifeDoc) {
      summary += '- Quality of life metrics are available\n';
    }
    
    if (jobMarketDoc) {
      summary += '- Job market information is available\n';
    }
    
    if (housingMarketDoc) {
      summary += '- Housing market data is available\n';
    }
    
    if (transportationDoc) {
      summary += '- Transportation information is available\n';
    }
    
    if (neighborhoodsDoc) {
      summary += '- Neighborhood data is available\n';
    }
    
    if (newsDoc) {
      summary += '- Recent news about the area is available\n';
    }
    
    // Add user preferences if available
    if (userPreferences) {
      summary += '\nUser Preferences:\n';
      for (const [key, value] of Object.entries(userPreferences)) {
        summary += `- ${key}: ${value}\n`;
      }
    }
    
    // Create simple recommendations
    const recommendations = [
      'Review the cost of living comparison between cities',
      'Check housing options in your budget range',
      'Research job opportunities in your industry',
      'Explore neighborhoods that match your lifestyle preferences',
      'Consider transportation options for your daily commute',
    ];
    
    return {
      summary,
      recommendations,
    };
  }

  /**
   * Build the prompt for Groq
   */
  private static buildGroqPrompt(
    documents: Document[],
    userPreferences?: Record<string, any>
  ): string {
    let prompt = 'Please analyze the following city data and provide a comprehensive summary.\n\n';
    
    // Add user preferences if available
    if (userPreferences) {
      prompt += 'User Preferences:\n';
      for (const [key, value] of Object.entries(userPreferences)) {
        prompt += `- ${key}: ${value}\n`;
      }
      prompt += '\n';
    }
    
    // Add data from each document
    for (const doc of documents) {
      prompt += `\n${doc.metadata.source.toUpperCase()} DATA:\n`;
      prompt += doc.pageContent;
      prompt += '\n';
    }
    
    prompt += '\nPlease provide:\n';
    prompt += '1. A comprehensive summary of the relocation analysis\n';
    prompt += '2. Specific recommendations based on the data and user preferences\n\n';
    prompt += 'Format your response as:\n';
    prompt += 'SUMMARY:\n[Your summary here]\n\n';
    prompt += 'RECOMMENDATIONS:\n- [Recommendation 1]\n- [Recommendation 2]\n...';
    
    return prompt;
  }
} 