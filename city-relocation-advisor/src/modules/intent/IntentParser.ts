import { GoogleGenerativeAI } from '@google/generative-ai';

// Define interfaces for the parser outputs
export interface LocationInfo {
  cities: string[];
  neighborhoods?: string[];
  states?: string[];
  countries?: string[];
}

export interface UserPreferences {
  budget?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  housingType?: string[];
  schoolQuality?: boolean;
  safetyPriority?: boolean;
  jobIndustry?: string[];
  transportationNeeds?: string[];
  lifestylePreferences?: string[];
  climate?: string[];
}

export enum QueryIntent {
  CITY_INFO = "CITY_INFO",                     // Information about a specific city
  CITY_COMPARISON = "CITY_COMPARISON",         // Compare multiple cities
  NEIGHBORHOOD_RECOMMENDATION = "NEIGHBORHOOD_RECOMMENDATION", // Recommend neighborhoods
  HOUSING_MARKET = "HOUSING_MARKET",           // Housing market information
  JOB_OPPORTUNITIES = "JOB_OPPORTUNITIES",     // Job market information
  SCHOOL_DISTRICTS = "SCHOOL_DISTRICTS",       // School information
  TRANSPORTATION = "TRANSPORTATION",           // Transportation information
  COST_OF_LIVING = "COST_OF_LIVING",           // Cost of living information
  LIFESTYLE_MATCH = "LIFESTYLE_MATCH",         // Match cities to lifestyle
  RELOCATION_LOGISTICS = "RELOCATION_LOGISTICS", // Moving logistics
  GENERAL_ADVICE = "GENERAL_ADVICE",           // General relocation advice
  OTHER = "OTHER"                              // Other queries
}

export interface ParsedIntent {
  intent: QueryIntent;
  locations: LocationInfo;
  preferences: UserPreferences;
  originalQuery: string;
  extractedKeywords: string[];
}

export class IntentParser {
  /**
   * Extract location names from a user query using regex pattern matching
   */
  static extractLocationNames(text: string): string[] {
    // List of major cities and states to look for in the text
    const locationPattern = /\b(New York|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Jose|Austin|Jacksonville|Fort Worth|Columbus|Indianapolis|Charlotte|San Francisco|Seattle|Denver|Washington DC|Boston|El Paso|Nashville|Detroit|Oklahoma City|Portland|Las Vegas|Memphis|Louisville|Baltimore|Milwaukee|Albuquerque|Tucson|Fresno|Sacramento|Kansas City|Mesa|Atlanta|Omaha|Colorado Springs|Raleigh|Miami|Long Beach|Virginia Beach|Oakland|Minneapolis|Tampa|Tulsa|Arlington|Honolulu|Wichita|Anaheim|Cleveland|New Orleans|Scottsdale|Tokyo|London|Paris|Berlin|Madrid|Rome|Amsterdam|Dublin|Toronto|Vancouver|Sydney|Chicago|Montreal|Miami|Shanghai|Beijing|Singapore|Dubai|Mumbai|Delhi|Hong Kong|Seoul|Bangkok|Kuala Lumpur|Jakarta|Manila|Hanoi|Yangon|Cairo|Lagos|Nairobi|Cape Town|Casablanca|Accra|Auckland|Wellington|Brisbane|Perth|Adelaide|Amsterdam|Oslo|Copenhagen|Stockholm|Helsinki|Reykjavik|Brussels|Vienna|Munich|Frankfurt|Zurich|Geneva|Milan|Barcelona|Lisbon|Porto|Athens|Istanbul|Moscow|St Petersburg|Prague|Warsaw|Budapest|Bucharest|Belgrade|Sofia|Riga|Tallinn|Vilnius)\b/gi;
    
    const matches = text.match(locationPattern);
    return matches ? Array.from(new Set(matches.map(city => city.toLowerCase()))) : [];
  }

  /**
   * Analyze text for budget-related information
   */
  static extractBudgetInfo(text: string): UserPreferences['budget'] | undefined {
    // Look for currency amounts
    const currencyPattern = /\$(\d{1,3}(,\d{3})*(\.\d{2})?)/g;
    const currencyMatches = Array.from(text.matchAll(currencyPattern));
    
    // Look for budget ranges
    const budgetRangePattern = /budget.{1,15}(\$\d{1,3}(,\d{3})*(\.\d{2})?)(?:.{1,10}(to|-|–)?.{1,10}(\$\d{1,3}(,\d{3})*(\.\d{2})?)?)?/gi;
    const budgetMatches = Array.from(text.matchAll(budgetRangePattern));
    
    if (currencyMatches.length > 0 || budgetMatches.length > 0) {
      // Simple implementation - just extract the numbers
      const amounts = currencyMatches.map(match => 
        parseFloat(match[1].replace(/,/g, ''))
      ).sort((a, b) => a - b);
      
      if (amounts.length === 0) {
        return undefined;
      }
      
      if (amounts.length === 1) {
        return { max: amounts[0], currency: 'USD' };
      }
      
      return {
        min: amounts[0],
        max: amounts[amounts.length - 1],
        currency: 'USD'
      };
    }
    
    return undefined;
  }

  /**
   * Extract housing type preferences from text
   */
  static extractHousingPreferences(text: string): string[] {
    const housingTypes = [
      'apartment', 'condo', 'house', 'townhouse', 'duplex', 
      'studio', 'loft', 'single-family', 'multi-family', 'rental'
    ];
    
    const matches = [];
    for (const type of housingTypes) {
      if (text.toLowerCase().includes(type)) {
        matches.push(type);
      }
    }
    
    return matches;
  }

  /**
   * Extract key preferences from the user query
   */
  static extractPreferences(text: string): UserPreferences {
    const preferences: UserPreferences = {};
    
    // Extract budget information
    preferences.budget = this.extractBudgetInfo(text);
    
    // Extract housing preferences
    const housingPreferences = this.extractHousingPreferences(text);
    if (housingPreferences.length > 0) {
      preferences.housingType = housingPreferences;
    }
    
    // Check for school-related concerns
    preferences.schoolQuality = /\b(school|education|college|university|academic)\b/i.test(text);
    
    // Check for safety concerns
    preferences.safetyPriority = /\b(safe|safety|crime|secure)\b/i.test(text);
    
    // Extract job industry preferences
    if (/\b(job|career|work|employment|industry|profession)\b/i.test(text)) {
      const industries = [
        'technology', 'healthcare', 'finance', 'education', 
        'retail', 'manufacturing', 'government', 'hospitality',
        'construction', 'entertainment', 'media', 'legal'
      ];
      
      preferences.jobIndustry = industries.filter(industry => 
        text.toLowerCase().includes(industry)
      );
    }
    
    // Extract transportation preferences
    if (/\b(commute|transport|transit|car|bus|train|subway|bike|walking)\b/i.test(text)) {
      const transportModes = [
        'car', 'public transit', 'bus', 'train', 'subway', 
        'bike', 'walking', 'short commute'
      ];
      
      preferences.transportationNeeds = transportModes.filter(mode => 
        text.toLowerCase().includes(mode.toLowerCase())
      );
    }
    
    // Extract lifestyle preferences
    const lifestyleKeywords = [
      'urban', 'suburban', 'rural', 'downtown', 'nightlife', 
      'restaurants', 'culture', 'outdoor', 'family-friendly', 
      'quiet', 'diverse', 'walkable', 'parks', 'beach', 'mountain'
    ];
    
    preferences.lifestylePreferences = lifestyleKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Extract climate preferences
    const climateKeywords = [
      'warm', 'hot', 'cold', 'mild', 'sunny', 'rainy', 
      'snow', 'humid', 'dry', 'moderate', 'tropical', 'desert'
    ];
    
    preferences.climate = climateKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
    
    return preferences;
  }

  /**
   * Determine the primary intent of the user's query
   */
  static determineIntent(text: string, locations: string[]): QueryIntent {
    const lowerText = text.toLowerCase();
    
    // Check for comparison intent
    if ((/compar(e|ing|ison)/i.test(text) || /vs\.?|versus/i.test(text)) && locations.length > 1) {
      return QueryIntent.CITY_COMPARISON;
    }
    
    // Check for neighborhood recommendations
    if (/neighborhood|area|district|part of town/i.test(text)) {
      return QueryIntent.NEIGHBORHOOD_RECOMMENDATION;
    }
    
    // Check for housing market intent
    if (/housing|home|apartment|rent|buy|price|real estate|property/i.test(text)) {
      return QueryIntent.HOUSING_MARKET;
    }
    
    // Check for job opportunities intent
    if (/job|work|career|employment|hire|hiring|salary|wage|industry/i.test(text)) {
      return QueryIntent.JOB_OPPORTUNITIES;
    }
    
    // Check for school districts intent
    if (/school|education|college|university|academic|student/i.test(text)) {
      return QueryIntent.SCHOOL_DISTRICTS;
    }
    
    // Check for transportation intent
    if (/transport|transit|commute|traffic|drive|bus|train|subway|bike|walk/i.test(text)) {
      return QueryIntent.TRANSPORTATION;
    }
    
    // Check for cost of living intent
    if (/cost of living|expense|affordable|cheap|budget|price/i.test(text)) {
      return QueryIntent.COST_OF_LIVING;
    }
    
    // Check for lifestyle match intent
    if (/lifestyle|culture|entertainment|food|restaurant|outdoor|activity|hobby/i.test(text)) {
      return QueryIntent.LIFESTYLE_MATCH;
    }
    
    // Check for relocation logistics intent
    if (/move|moving|relocate|relocation|logistics|process|paperwork|visa/i.test(text)) {
      return QueryIntent.RELOCATION_LOGISTICS;
    }
    
    // If a location is mentioned but no specific intent, default to city info
    if (locations.length > 0) {
      return QueryIntent.CITY_INFO;
    }
    
    // General advice as fallback
    if (/advice|suggest|recommendation|should I|where|what/i.test(text)) {
      return QueryIntent.GENERAL_ADVICE;
    }
    
    // Default to OTHER
    return QueryIntent.OTHER;
  }

  /**
   * Extract keywords from the query
   */
  static extractKeywords(text: string): string[] {
    // Simple keyword extraction - remove stopwords and keep significant terms
    const stopwords = [
      'a', 'an', 'the', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should',
      'can', 'could', 'may', 'might', 'must', 'to', 'of', 'in', 'on', 'at', 'by', 'for',
      'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after',
      'above', 'below', 'from', 'up', 'down', 'and', 'but', 'or', 'so', 'than', 'if', 'as'
    ];
    
    return text.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .split(/\s+/)
      .filter(word => !stopwords.includes(word) && word.length > 2);
  }

  /**
   * Advanced intent parsing with Gemini API (optional enhancement)
   */
  static async parseWithGemini(queryText: string): Promise<ParsedIntent | null> {
    try {
      if (!process.env.GOOGLE_API_KEY) {
        console.error('Gemini API key is missing');
        return null;
      }
      
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
      Analyze this relocation query and extract structured information:
      "${queryText}"
      
      Respond with a JSON object containing:
      {
        "intent": <One of: CITY_INFO, CITY_COMPARISON, NEIGHBORHOOD_RECOMMENDATION, HOUSING_MARKET, JOB_OPPORTUNITIES, SCHOOL_DISTRICTS, TRANSPORTATION, COST_OF_LIVING, LIFESTYLE_MATCH, RELOCATION_LOGISTICS, GENERAL_ADVICE, OTHER>,
        "locations": {
          "cities": ["city1", "city2"],
          "neighborhoods": [],
          "states": [],
          "countries": []
        },
        "preferences": {
          "budget": {"min": null, "max": null, "currency": "USD"},
          "housingType": [],
          "schoolQuality": true/false,
          "safetyPriority": true/false,
          "jobIndustry": [],
          "transportationNeeds": [],
          "lifestylePreferences": [],
          "climate": []
        },
        "extractedKeywords": []
      }
      
      Only include non-empty arrays and values. Use null for missing numeric values.
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        try {
          const parsed = JSON.parse(jsonStr);
          return {
            ...parsed,
            originalQuery: queryText
          };
        } catch (e) {
          console.error('Error parsing Gemini JSON output:', e);
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error using Gemini for intent parsing:', error);
      return null;
    }
  }

  /**
   * Main method to parse a user query
   */
  static async parse(query: string): Promise<ParsedIntent> {
    console.log(`🔍 Parsing intent for query: "${query}"`);
    
    // Try to use Gemini for more advanced parsing
    try {
      const geminiResult = await this.parseWithGemini(query);
      if (geminiResult) {
        console.log('✅ Intent parsed with Gemini API');
        return geminiResult;
      }
    } catch (error) {
      console.log('⚠️ Gemini parsing failed, falling back to rule-based parsing');
    }
    
    // Fall back to rule-based parsing
    const locations = this.extractLocationNames(query);
    const preferences = this.extractPreferences(query);
    const intent = this.determineIntent(query, locations);
    const extractedKeywords = this.extractKeywords(query);
    
    const result: ParsedIntent = {
      intent,
      locations: {
        cities: locations,
      },
      preferences,
      originalQuery: query,
      extractedKeywords
    };
    
    console.log(`✅ Intent determined: ${intent}`);
    console.log(`🌆 Locations found: ${locations.length > 0 ? locations.join(', ') : 'None'}`);
    
    return result;
  }
} 