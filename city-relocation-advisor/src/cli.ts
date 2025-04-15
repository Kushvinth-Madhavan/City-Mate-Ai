import { processMessage, Message } from './utils/chatbot';
import { v4 as uuidv4 } from 'uuid';
import * as readline from 'readline';
import { ensureVectorStoreExists } from './utils/supabase';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Generate a user ID for this session
const userId = uuidv4();

// Store conversation history
const messages: Message[] = [];

async function startChatbot() {
  console.log('\n=== City Relocation Advisor Chatbot (CLI) ===');
  console.log('Type "exit" to end the conversation\n');
  
  // Ensure vector store exists
  try {
    await ensureVectorStoreExists();
    console.log('Vector store initialized successfully\n');
  } catch (error) {
    console.error('Error initializing vector store:', error);
    console.log('Continuing without vector store...\n');
  }
  
  // Add system message to start
  const systemMessage: Message = {
    id: uuidv4(),
    role: 'system',
    content: `You are CityMate, an AI city relocation advisor. Your goal is to help users evaluate potential cities for relocation based on their personal preferences and needs.`
  };
  
  messages.push(systemMessage);
  
  // Print welcome message
  console.log('👋 Hello! I\'m CityMate, your AI relocation advisor. I can help you evaluate cities for relocation based on your preferences and needs. How can I assist you today?');
  
  // Start chat loop
  promptUser();
}

function promptUser() {
  rl.question('You: ', async (input) => {
    // Check for exit command
    if (input.toLowerCase() === 'exit') {
      console.log('\nThank you for using the City Relocation Advisor! Goodbye. 👋');
      rl.close();
      process.exit(0);
    }
    
    try {
      // Process the message
      const response = await processMessage(userId, messages, input);
      
      // Add user message and response to history
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: input,
        createdAt: new Date()
      };
      
      messages.push(userMessage);
      messages.push(response);
      
      // Display the response
      console.log(`\nCityMate: ${response.content}\n`);
    } catch (error) {
      console.error('Error processing message:', error);
      console.log('\nCityMate: I apologize, but I encountered an error. Please try again or rephrase your question.\n');
    }
    
    // Prompt for next input
    promptUser();
  });
}

// Start the chatbot
startChatbot().catch(error => {
  console.error('Error starting chatbot:', error);
  process.exit(1);
}); 