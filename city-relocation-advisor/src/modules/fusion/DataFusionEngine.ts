import { APIResults } from '../orchestration/APIOrchestrator';
import { ParsedIntent, QueryIntent } from '../intent/IntentParser';

// Define the structure for processed, normalized data
export interface CityData {
  name: string;
  fullName?: string;
  scores?: {
    housing?: number;
    costOfLiving?: number;
    safety?: number;
    education?: number;
    economy?: number;
    environment?: number;
    healthcare?: number;
    [key: string]: number | undefined;
  };
  summary?: string;
  highlights?: string[];
  neighborhoods?: any[];
  housingMarket?: any;
  jobMarket?: any;
  transportation?: any;
  schools?: any;
  news?: any[];
  webResults?: any[];
}

export interface FusedData {
  cities: CityData[];
  comparison?: {
    winner?: string;
    categories: {
      [category: string]: {
        best: string;
        difference: string;
      };
    };
  };
  generalInfo?: any;
  originalQuery: string;
  intent: QueryIntent;
  error?: string;
}

export class DataFusionEngine {
  /**
   * Extract score data from Teleport API response
   */
  static extractScores(cityInfo: any): Record<string, number> | undefined {
    if (!cityInfo || !cityInfo.urbanArea || !cityInfo.urbanArea.scores) {
      return undefined;
    }
    
    const scores: Record<string, number> = {};
    
    try {
      const categories = cityInfo.urbanArea.scores.categories || [];
      
      // Map Teleport categories to our simplified categories
      const categoryMapping: Record<string, string> = {
        'Housing': 'housing',
        'Cost of Living': 'costOfLiving',
        'Safety': 'safety',
        'Education': 'education',
        'Economy': 'economy',
        'Environmental Quality': 'environment',
        'Healthcare': 'healthcare',
        'Business Freedom': 'business',
        'Outdoors': 'outdoors',
        'Commute': 'commute',
        'Leisure & Culture': 'culture',
        'Tolerance': 'tolerance',
        'Internet Access': 'internet',
        'Startups': 'startups'
      };
      
      // Process each category
      categories.forEach((category: any) => {
        const name = category.name;
        const mappedName = categoryMapping[name] || name.toLowerCase().replace(/\s+/g, '');
        scores[mappedName] = parseFloat(category.score_out_of_10.toFixed(1));
      });
      
      return scores;
    } catch (error) {
      console.error('Error extracting scores:', error);
      return undefined;
    }
  }

  /**
   * Extract neighborhood data from Radar API
   */
  static extractNeighborhoods(neighborhoodInfo: any): any[] {
    if (!neighborhoodInfo || !neighborhoodInfo.features) {
      return [];
    }
    
    try {
      return neighborhoodInfo.features.map((feature: any) => ({
        name: feature.properties?.neighborhood || feature.properties?.name || 'Unknown',
        city: feature.properties?.city || 'Unknown',
        state: feature.properties?.state || 'Unknown',
        country: feature.properties?.country || 'Unknown',
        coordinates: feature.geometry?.coordinates || null
      }));
    } catch (error) {
      console.error('Error extracting neighborhoods:', error);
      return [];
    }
  }

  /**
   * Extract news articles
   */
  static extractNews(newsInfo: any): any[] {
    if (!newsInfo || !newsInfo.articles) {
      return [];
    }
    
    try {
      return newsInfo.articles.map((article: any) => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source.name,
        publishedAt: article.publishedAt
      }));
    } catch (error) {
      console.error('Error extracting news:', error);
      return [];
    }
  }

  /**
   * Extract web search results
   */
  static extractWebResults(webSearch: any): any[] {
    if (!webSearch || !webSearch.organic) {
      return [];
    }
    
    try {
      return webSearch.organic.map((result: any) => ({
        title: result.title,
        description: result.snippet,
        url: result.link
      }));
    } catch (error) {
      console.error('Error extracting web results:', error);
      return [];
    }
  }

  /**
   * Process data for a single city
   */
  static processCityData(cityName: string, apiResults: APIResults): CityData {
    console.log(`🔄 Processing data for city: ${cityName}`);
    
    const cityData: CityData = {
      name: cityName,
    };
    
    // Process city info (Teleport API)
    if (apiResults.cityInfo) {
      if (apiResults.cityInfo.urbanArea) {
        cityData.fullName = apiResults.cityInfo.urbanArea.fullName || apiResults.cityInfo.urbanArea.name;
        cityData.scores = this.extractScores(apiResults.cityInfo);
      } else if (apiResults.cityInfo.city) {
        cityData.fullName = apiResults.cityInfo.city.full_name || apiResults.cityInfo.city.name;
      }
      
      // Handle fallback data if Teleport API failed
      if (apiResults.cityInfo.fallbackData) {
        cityData.summary = `Information about ${cityName} (using fallback data)`;
        cityData.scores = {};
        
        // Convert string scores to numbers if available
        const estimatedScores = apiResults.cityInfo.fallbackData.estimatedScores;
        if (estimatedScores) {
          Object.keys(estimatedScores).forEach(key => {
            const value = estimatedScores[key];
            if (typeof value === 'number') {
              if (!cityData.scores) cityData.scores = {};
              cityData.scores[key] = value;
            }
          });
        }
      }
    }
    
    // Process neighborhood data
    if (apiResults.neighborhoods) {
      cityData.neighborhoods = this.extractNeighborhoods(apiResults.neighborhoods);
    }
    
    // Process news
    if (apiResults.news) {
      cityData.news = this.extractNews(apiResults.news);
    }
    
    // Process web search results
    if (apiResults.webSearch) {
      cityData.webResults = this.extractWebResults(apiResults.webSearch);
    }
    
    // Process housing market data
    if (apiResults.housingMarket) {
      cityData.housingMarket = {
        summary: apiResults.housingMarket.summaries 
          ? apiResults.housingMarket.summaries.map((s: any) => s.summary).join(' ') 
          : undefined,
        sources: apiResults.housingMarket.summaries 
          ? apiResults.housingMarket.summaries.map((s: any) => s.source) 
          : undefined,
        highlights: apiResults.housingMarket.summaries 
          ? apiResults.housingMarket.summaries.flatMap((s: any) => s.keyPoints || []) 
          : []
      };
    }
    
    // Process job market data
    if (apiResults.jobOpportunities) {
      cityData.jobMarket = {
        summary: apiResults.jobOpportunities.summaries 
          ? apiResults.jobOpportunities.summaries.map((s: any) => s.summary).join(' ') 
          : undefined,
        sources: apiResults.jobOpportunities.summaries 
          ? apiResults.jobOpportunities.summaries.map((s: any) => s.source) 
          : undefined,
        highlights: apiResults.jobOpportunities.summaries 
          ? apiResults.jobOpportunities.summaries.flatMap((s: any) => s.keyPoints || []) 
          : []
      };
    }
    
    // Process transportation data
    if (apiResults.transportation) {
      cityData.transportation = {
        summary: apiResults.transportation.summaries 
          ? apiResults.transportation.summaries.map((s: any) => s.summary).join(' ') 
          : undefined,
        sources: apiResults.transportation.summaries 
          ? apiResults.transportation.summaries.map((s: any) => s.source) 
          : undefined,
        highlights: apiResults.transportation.summaries 
          ? apiResults.transportation.summaries.flatMap((s: any) => s.keyPoints || []) 
          : []
      };
    }
    
    // Process school district data
    if (apiResults.schoolDistricts) {
      cityData.schools = {
        summary: apiResults.schoolDistricts.summaries 
          ? apiResults.schoolDistricts.summaries.map((s: any) => s.summary).join(' ') 
          : undefined,
        sources: apiResults.schoolDistricts.summaries 
          ? apiResults.schoolDistricts.summaries.map((s: any) => s.source) 
          : undefined,
        highlights: apiResults.schoolDistricts.summaries 
          ? apiResults.schoolDistricts.summaries.flatMap((s: any) => s.keyPoints || []) 
          : []
      };
    }
    
    return cityData;
  }

  /**
   * Compare cities based on their scores
   */
  static compareCities(cities: CityData[]): FusedData['comparison'] | undefined {
    if (cities.length < 2) {
      return undefined;
    }
    
    const city1 = cities[0];
    const city2 = cities[1];
    
    if (!city1.scores || !city2.scores) {
      return undefined;
    }
    
    const categories: Record<string, { best: string; difference: string }> = {};
    const allCategories = new Set([...Object.keys(city1.scores), ...Object.keys(city2.scores)]);
    
    let city1Wins = 0;
    let city2Wins = 0;
    
    allCategories.forEach(category => {
      const score1 = city1.scores?.[category] || 0;
      const score2 = city2.scores?.[category] || 0;
      
      if (score1 > score2) {
        categories[category] = {
          best: city1.name,
          difference: (score1 - score2).toFixed(1)
        };
        city1Wins++;
      } else if (score2 > score1) {
        categories[category] = {
          best: city2.name,
          difference: (score2 - score1).toFixed(1)
        };
        city2Wins++;
      } else {
        categories[category] = {
          best: 'tie',
          difference: '0.0'
        };
      }
    });
    
    return {
      winner: city1Wins > city2Wins ? city1.name : city2Wins > city1Wins ? city2.name : 'tie',
      categories
    };
  }

  /**
   * Main method to merge and process API data
   */
  static merge(parsedIntent: ParsedIntent, apiResults: APIResults): FusedData {
    console.log('🔄 Starting data fusion process');
    
    try {
      const { intent, locations, originalQuery } = parsedIntent;
      const cities = locations.cities || [];
      
      // Default data structure
      const fusedData: FusedData = {
        cities: [],
        originalQuery,
        intent
      };
      
      // Process each city's data
      for (const cityName of cities) {
        const cityData = this.processCityData(cityName, apiResults);
        fusedData.cities.push(cityData);
      }
      
      // If no cities were specified but we have city-specific API results, 
      // create a generic city entry
      if (cities.length === 0 && (apiResults.cityInfo || apiResults.neighborhoods)) {
        const defaultCityName = 'New York'; // Use as fallback
        const cityData = this.processCityData(defaultCityName, apiResults);
        fusedData.cities.push(cityData);
      }
      
      // Add comparison if comparing multiple cities
      if (fusedData.cities.length >= 2) {
        fusedData.comparison = this.compareCities(fusedData.cities);
      }
      
      // Add general information from web search if no specific cities
      if (fusedData.cities.length === 0 && apiResults.webSearch) {
        fusedData.generalInfo = {
          webResults: this.extractWebResults(apiResults.webSearch)
        };
      }
      
      console.log(`✅ Data fusion complete: processed ${fusedData.cities.length} cities`);
      return fusedData;
    } catch (error) {
      console.error('❌ Error during data fusion:', error);
      return {
        cities: [],
        originalQuery: parsedIntent.originalQuery,
        intent: parsedIntent.intent,
        error: 'Failed to process API data'
      };
    }
  }
} 