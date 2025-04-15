import { GoogleGenerativeAI } from '@google/generative-ai';
import { FusedData } from '../fusion/DataFusionEngine';
import { ParsedIntent, QueryIntent } from '../intent/IntentParser';

export interface ReasoningOutput {
  answer: string;
  reasoning: string;
  recommendations?: string[];
  error?: string;
}

export class ReasoningEngine {
  /**
   * Format city data for use in prompts
   */
  static formatCityData(fusedData: FusedData): string {
    try {
      const { cities, comparison, intent } = fusedData;
      
      let formattedData = `DATA ABOUT ${cities.length > 1 ? 'CITIES' : 'CITY'}:\n\n`;
      
      // Format data for each city
      cities.forEach(city => {
        formattedData += `CITY: ${city.fullName || city.name}\n`;
        
        // Add scores if available
        if (city.scores) {
          formattedData += 'SCORES (out of 10):\n';
          Object.entries(city.scores).forEach(([category, score]) => {
            formattedData += `- ${category}: ${score}\n`;
          });
        }
        
        // Add housing market information
        if (city.housingMarket?.summary) {
          formattedData += '\nHOUSING MARKET:\n';
          formattedData += city.housingMarket.summary + '\n';
          
          if (city.housingMarket.highlights && city.housingMarket.highlights.length > 0) {
            formattedData += 'Key points:\n';
            city.housingMarket.highlights.slice(0, 3).forEach((point: string) => {
              formattedData += `- ${point}\n`;
            });
          }
        }
        
        // Add job market information
        if (city.jobMarket?.summary) {
          formattedData += '\nJOB MARKET:\n';
          formattedData += city.jobMarket.summary + '\n';
        }
        
        // Add transportation information
        if (city.transportation?.summary) {
          formattedData += '\nTRANSPORTATION:\n';
          formattedData += city.transportation.summary + '\n';
        }
        
        // Add schools information
        if (city.schools?.summary) {
          formattedData += '\nSCHOOLS:\n';
          formattedData += city.schools.summary + '\n';
        }
        
        // Add neighborhood information
        if (city.neighborhoods && city.neighborhoods.length > 0) {
          formattedData += '\nNEIGHBORHOODS:\n';
          city.neighborhoods.slice(0, 5).forEach(neighborhood => {
            formattedData += `- ${neighborhood.name}\n`;
          });
        }
        
        // Add news information
        if (city.news && city.news.length > 0) {
          formattedData += '\nRECENT NEWS:\n';
          city.news.slice(0, 3).forEach(article => {
            formattedData += `- ${article.title}\n`;
          });
        }
        
        formattedData += '\n---\n\n';
      });
      
      // Add comparison information if available
      if (comparison) {
        formattedData += 'COMPARISON BETWEEN CITIES:\n';
        
        if (comparison.winner && comparison.winner !== 'tie') {
          formattedData += `Overall winner: ${comparison.winner}\n\n`;
        } else {
          formattedData += 'The cities are very close overall.\n\n';
        }
        
        formattedData += 'Category breakdown:\n';
        Object.entries(comparison.categories).forEach(([category, data]) => {
          formattedData += `- ${category}: ${data.best} is better by ${data.difference} points\n`;
        });
        
        formattedData += '\n---\n\n';
      }
      
      return formattedData;
    } catch (error) {
      console.error('Error formatting city data:', error);
      return 'Error: Could not format city data for reasoning.';
    }
  }

  /**
   * Generate a prompt for Gemini based on intent and data
   */
  static generatePrompt(parsedIntent: ParsedIntent, fusedData: FusedData): string {
    const { intent } = parsedIntent;
    const originalQuery = parsedIntent.originalQuery;
    const cityData = this.formatCityData(fusedData);
    
    let systemPrompt = `You are CityMate, an AI-powered city relocation advisor. Your goal is to provide helpful, accurate, and balanced information about cities to help users make informed decisions about where to live.
    
USER QUERY: "${originalQuery}"

${cityData}

Based on this data, create a comprehensive response for the user. `;
    
    // Add intent-specific instructions
    switch (intent) {
      case QueryIntent.CITY_INFO:
        systemPrompt += `Focus on providing a balanced overview of what life is like in this city, highlighting strengths and potential drawbacks.`;
        break;
        
      case QueryIntent.CITY_COMPARISON:
        systemPrompt += `Provide a detailed comparison between these cities, focusing on quality of life, cost of living, job opportunities, and other key factors. Make a recommendation based on which city would be better for most people, but acknowledge that personal preferences matter.`;
        break;
        
      case QueryIntent.NEIGHBORHOOD_RECOMMENDATION:
        systemPrompt += `Recommend specific neighborhoods that might be a good fit based on the data provided, and explain why.`;
        break;
        
      case QueryIntent.HOUSING_MARKET:
        systemPrompt += `Focus on the current state of the housing market, trends in home prices or rent, and affordability for different income levels.`;
        break;
        
      case QueryIntent.JOB_OPPORTUNITIES:
        systemPrompt += `Analyze the job market, focusing on growing industries, typical salaries, and employment outlook.`;
        break;
        
      case QueryIntent.SCHOOL_DISTRICTS:
        systemPrompt += `Provide information about the quality of schools, highlighting top-performing districts and educational opportunities.`;
        break;
        
      case QueryIntent.TRANSPORTATION:
        systemPrompt += `Explain transportation options, commute times, walkability, and public transit availability.`;
        break;
        
      case QueryIntent.COST_OF_LIVING:
        systemPrompt += `Break down the cost of living, including housing, transportation, food, and other expenses. Provide context by comparing to national averages.`;
        break;
        
      case QueryIntent.LIFESTYLE_MATCH:
        systemPrompt += `Analyze how well these locations might match the user's lifestyle preferences, focusing on culture, activities, and quality of life.`;
        break;
        
      case QueryIntent.RELOCATION_LOGISTICS:
        systemPrompt += `Provide practical advice about the relocation process, including timeline considerations, moving costs, and administrative steps like updating documentation.`;
        break;
        
      case QueryIntent.GENERAL_ADVICE:
      case QueryIntent.OTHER:
      default:
        systemPrompt += `Provide thoughtful advice about city relocation based on the information available, and suggest what other factors the user might want to consider.`;
        break;
    }
    
    systemPrompt += `

Structure your response like this:
1. A direct answer to the user's question
2. Key points explaining your reasoning
3. Any relevant recommendations
4. (Optional) Follow-up questions they might consider

Use a conversational tone and focus on accuracy. If the data provided doesn't answer certain aspects of the query, acknowledge this gap rather than making up information.`;
    
    return systemPrompt;
  }

  /**
   * Parse Gemini's response into structured output
   */
  static parseResponse(response: string): ReasoningOutput {
    try {
      // Extract the main answer (first paragraph)
      const paragraphs = response.split('\n\n').filter(p => p.trim());
      const answer = paragraphs[0] || response;
      
      // Extract reasoning (rest of the response)
      const reasoning = paragraphs.slice(1).join('\n\n') || response;
      
      // Try to extract recommendations
      const recommendationMatch = response.match(/recommendations?:?([\s\S]*?)(?:\n\n|$)/i);
      const recommendations = recommendationMatch 
        ? recommendationMatch[1]
          .split(/\n-|\n\d+\./)
          .filter(r => r.trim())
          .map(r => r.trim())
        : undefined;
      
      return {
        answer,
        reasoning,
        recommendations
      };
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      return {
        answer: response,
        reasoning: 'Error parsing response structure',
        error: 'Failed to parse Gemini response'
      };
    }
  }

  /**
   * Main method to generate a response using Gemini
   */
  static async generate(parsedIntent: ParsedIntent, fusedData: FusedData): Promise<ReasoningOutput> {
    try {
      console.log('🧠 Generating response with Gemini...');
      
      if (!process.env.GOOGLE_API_KEY) {
        throw new Error('Gemini API key is missing');
      }
      
      // Create a prompt for Gemini
      const prompt = this.generatePrompt(parsedIntent, fusedData);
      console.log('📝 Generated prompt for Gemini');
      
      // Call Gemini API
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      console.log('🔄 Calling Gemini API...');
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      
      console.log('✅ Received response from Gemini');
      
      // Parse the response
      const parsedResponse = this.parseResponse(responseText);
      
      return parsedResponse;
    } catch (error) {
      console.error('❌ Error generating response with Gemini:', error);
      return {
        answer: 'I apologize, but I encountered an error while processing your request.',
        reasoning: 'The reasoning engine experienced a technical issue.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 