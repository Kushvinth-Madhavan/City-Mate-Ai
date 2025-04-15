const { Groq } = require('groq-sdk');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Test script for the Groq API
 * Run with: node src/lib/test-groq.js
 */
async function testGroqAPI() {
  console.log('🧪 Testing Groq API...');
  
  // Check if API key is available
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('❌ GROQ_API_KEY is not set in the .env file');
    process.exit(1);
  }
  
  console.log('✅ GROQ_API_KEY found');
  
  try {
    // Initialize Groq client
    const groq = new Groq({
      apiKey: apiKey
    });
    
    console.log('✅ Groq client initialized');
    
    // Test a simple completion
    console.log('🔄 Testing completion...');
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: 'Hello! Can you tell me a joke?'
        }
      ],
      model: 'deepseek-r1-distill-llama-70b',
      temperature: 0.7,
      max_tokens: 100,
    });
    
    console.log('✅ Completion successful!');
    console.log('\nResponse:');
    console.log(completion.choices[0].message.content);
    
    // Test a more complex completion for city comparison
    console.log('\n🔄 Testing city comparison completion...');
    const cityCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a city relocation advisor helping someone move from Chennai to San Francisco. 
          Analyze the provided data and give detailed, helpful advice about the relocation. Focus on:
          1. Cost of living differences
          2. Housing market comparison
          3. Job market and opportunities
          4. Quality of life factors
          5. Specific neighborhood recommendations
          6. Practical relocation advice`
        },
        {
          role: 'user',
          content: `Compare Chennai and San Francisco. Here's some sample data:
          - Cost of Living: Chennai is generally more affordable than San Francisco
          - Housing Market: San Francisco has a very competitive housing market with high prices
          - Job Market: Both cities have strong tech sectors, but San Francisco has more opportunities
          - Quality of Life: Both cities offer good quality of life but in different ways
          - Recent News: Both cities are experiencing growth and development`
        }
      ],
      model: 'deepseek-r1-distill-llama-70b',
      temperature: 0.7,
      max_tokens: 500,
    });
    
    console.log('✅ City comparison completion successful!');
    console.log('\nResponse:');
    console.log(cityCompletion.choices[0].message.content);
    
    console.log('\n✅ All tests passed! Groq API is working correctly.');
    
  } catch (error) {
    console.error('❌ Error testing Groq API:', error);
    process.exit(1);
  }
}

// Run the test
testGroqAPI()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 