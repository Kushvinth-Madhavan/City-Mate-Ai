import { ReasoningOutput } from '../reasoning/ReasoningEngine';
import { FusedData, CityData } from '../fusion/DataFusionEngine';
import { ParsedIntent, QueryIntent } from '../intent/IntentParser';

export interface FormattedResponse {
  text: string;
  html?: string;
  maps?: {
    title: string;
    url: string;
  }[];
  images?: {
    title: string;
    url: string;
    attribution?: string;
  }[];
  webResults?: {
    title: string;
    url: string;
    description: string;
  }[];
  newsLinks?: {
    title: string;
    url: string;
    source: string;
  }[];
  raw?: any;
}

export class ResponseGenerator {
  /**
   * Generate a map link for a city or neighborhood
   */
  static generateMapLink(location: string): string {
    const encodedLocation = encodeURIComponent(location);
    return `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
  }

  /**
   * Extract links to include in the response
   */
  static extractLinks(fusedData: FusedData): {webResults: any[], newsLinks: any[]} {
    const webResults: any[] = [];
    const newsLinks: any[] = [];
    
    // Extract web results from each city
    fusedData.cities.forEach(city => {
      if (city.webResults) {
        webResults.push(...city.webResults.slice(0, 3));
      }
      
      if (city.news) {
        newsLinks.push(...city.news.slice(0, 3));
      }
    });
    
    // Add general web results if available
    if (fusedData.generalInfo?.webResults) {
      webResults.push(...fusedData.generalInfo.webResults.slice(0, 3));
    }
    
    return {
      webResults: webResults.slice(0, 5), // Limit to 5 results
      newsLinks: newsLinks.slice(0, 3)    // Limit to 3 news articles
    };
  }

  /**
   * Generate maps for cities and neighborhoods
   */
  static generateMaps(fusedData: FusedData): FormattedResponse['maps'] {
    const maps: FormattedResponse['maps'] = [];
    
    // Add maps for each city
    fusedData.cities.forEach(city => {
      maps.push({
        title: `Map of ${city.fullName || city.name}`,
        url: this.generateMapLink(city.fullName || city.name)
      });
      
      // Add maps for neighborhoods if available (limit to 3)
      if (city.neighborhoods && city.neighborhoods.length > 0) {
        city.neighborhoods.slice(0, 3).forEach(neighborhood => {
          const neighborhoodName = neighborhood.name;
          const cityName = city.name;
          
          maps.push({
            title: `Map of ${neighborhoodName} in ${cityName}`,
            url: this.generateMapLink(`${neighborhoodName}, ${cityName}`)
          });
        });
      }
    });
    
    return maps;
  }

  /**
   * Format the response as HTML
   */
  static formatHtml(
    reasoningOutput: ReasoningOutput, 
    fusedData: FusedData,
    links: {webResults: any[], newsLinks: any[]},
    maps: FormattedResponse['maps']
  ): string {
    const { answer, reasoning, recommendations } = reasoningOutput;
    
    // Start building HTML
    let html = `
      <div class="city-response">
        <div class="answer">
          ${answer}
        </div>
        
        <div class="reasoning">
          ${reasoning.split('\n\n').map(p => `<p>${p}</p>`).join('')}
        </div>
    `;
    
    // Add recommendations if available
    if (recommendations && recommendations.length > 0) {
      html += `
        <div class="recommendations">
          <h3>Recommendations</h3>
          <ul>
            ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    
    // Add maps section if available
    if (maps && maps.length > 0) {
      html += `
        <div class="maps">
          <h3>Maps</h3>
          <ul>
            ${maps.map(map => `<li><a href="${map.url}" target="_blank">${map.title}</a></li>`).join('')}
          </ul>
        </div>
      `;
    }
    
    // Add web results if available
    if (links.webResults.length > 0) {
      html += `
        <div class="web-results">
          <h3>Sources</h3>
          <ul>
            ${links.webResults.map(result => 
              `<li><a href="${result.url}" target="_blank">${result.title}</a> - ${result.description}</li>`
            ).join('')}
          </ul>
        </div>
      `;
    }
    
    // Add news links if available
    if (links.newsLinks.length > 0) {
      html += `
        <div class="news-links">
          <h3>Recent News</h3>
          <ul>
            ${links.newsLinks.map(news => 
              `<li><a href="${news.url}" target="_blank">${news.title}</a> - ${news.source}</li>`
            ).join('')}
          </ul>
        </div>
      `;
    }
    
    // Add city comparison if available
    if (fusedData.comparison && fusedData.cities.length >= 2) {
      html += `
        <div class="city-comparison">
          <h3>City Comparison</h3>
          <p>Overall winner: ${fusedData.comparison.winner || 'Tie'}</p>
          <table>
            <tr>
              <th>Category</th>
              <th>Better City</th>
              <th>Difference</th>
            </tr>
            ${Object.entries(fusedData.comparison.categories).map(([category, data]) => `
              <tr>
                <td>${category}</td>
                <td>${data.best}</td>
                <td>${data.difference}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      `;
    }
    
    html += `</div>`;
    
    return html;
  }

  /**
   * Main method to format the final response
   */
  static format(
    reasoningOutput: ReasoningOutput, 
    fusedData: FusedData, 
    parsedIntent: ParsedIntent
  ): FormattedResponse {
    try {
      console.log('🎨 Formatting final response...');
      
      // Extract links
      const links = this.extractLinks(fusedData);
      
      // Generate maps
      const maps = this.generateMaps(fusedData);
      
      // Format HTML response
      const html = this.formatHtml(reasoningOutput, fusedData, links, maps);
      
      // Format plain text response (simplified version of HTML without tags)
      const text = reasoningOutput.answer + '\n\n' + 
        reasoningOutput.reasoning + 
        (reasoningOutput.recommendations ? '\n\nRecommendations:\n- ' + 
        reasoningOutput.recommendations.join('\n- ') : '');
      
      console.log('✅ Response formatting complete');
      
      return {
        text,
        html,
        maps,
        webResults: links.webResults,
        newsLinks: links.newsLinks,
        raw: {
          reasoning: reasoningOutput,
          fusedData,
          parsedIntent
        }
      };
    } catch (error) {
      console.error('❌ Error formatting response:', error);
      
      // Fallback to simple text response
      return {
        text: reasoningOutput.answer || 'Sorry, there was an error processing your request.',
        raw: {
          error: error instanceof Error ? error.message : 'Unknown error',
          reasoning: reasoningOutput,
          fusedData,
          parsedIntent
        }
      };
    }
  }
} 