import { IntentParser } from './intent/IntentParser';
import { APIOrchestrator } from './orchestration/APIOrchestrator';
import { DataFusionEngine } from './fusion/DataFusionEngine';
import { ReasoningEngine } from './reasoning/ReasoningEngine';
import { ResponseGenerator } from './response/ResponseGenerator';

export interface QueryProcessingOptions {
  useCache?: boolean;
  debugLogs?: boolean;
  timeoutMs?: number;
}

/**
 * Main processing pipeline for handling a user query
 */
export async function processUserQuery(
  query: string, 
  options: QueryProcessingOptions = {}
) {
  const startTime = Date.now();
  const { useCache = false, debugLogs = false, timeoutMs = 30000 } = options;
  
  // Set up timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Query processing timed out')), timeoutMs);
  });
  
  // Process the query with timeout
  try {
    const processingPromise = processQueryWithLogging(query, debugLogs);
    return await Promise.race([processingPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error processing query:', error);
    return {
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      text: 'I apologize, but I encountered an error while processing your request. Please try again later.'
    };
  } finally {
    const endTime = Date.now();
    console.log(`Query processed in ${endTime - startTime}ms`);
  }
}

/**
 * Internal function to process the query with optional logging
 */
async function processQueryWithLogging(query: string, debugLogs: boolean) {
  try {
    // Step 1: Parse intent
    console.log(`🔍 Parsing intent for query: "${query}"`);
    const parsedIntent = await IntentParser.parse(query);
    if (debugLogs) {
      console.log('📊 Parsed Intent:', JSON.stringify(parsedIntent, null, 2));
    }
    
    // Step 2: Orchestrate API calls
    console.log('🔄 Orchestrating API calls...');
    const apiResults = await APIOrchestrator.fetch(parsedIntent);
    if (debugLogs) {
      console.log('📊 API Results:', JSON.stringify(apiResults, null, 2));
    }
    
    // Step 3: Merge and process data
    console.log('🔄 Merging and processing data...');
    const fusedData = DataFusionEngine.merge(parsedIntent, apiResults);
    if (debugLogs) {
      console.log('📊 Fused Data:', JSON.stringify(fusedData, null, 2));
    }
    
    // Step 4: Generate reasoning and response
    console.log('🧠 Generating response with reasoning...');
    const reasoningOutput = await ReasoningEngine.generate(parsedIntent, fusedData);
    if (debugLogs) {
      console.log('📊 Reasoning Output:', JSON.stringify(reasoningOutput, null, 2));
    }
    
    // Step 5: Format the response
    console.log('🎨 Formatting final response...');
    const formattedResponse = ResponseGenerator.format(reasoningOutput, fusedData, parsedIntent);
    
    console.log('✅ Query processing complete');
    return formattedResponse;
  } catch (error) {
    console.error('❌ Error during query processing:', error);
    throw error;
  }
}

// Export all modules
export { IntentParser } from './intent/IntentParser';
export { APIOrchestrator } from './orchestration/APIOrchestrator';
export { DataFusionEngine } from './fusion/DataFusionEngine';
export { ReasoningEngine } from './reasoning/ReasoningEngine';
export { ResponseGenerator } from './response/ResponseGenerator'; 