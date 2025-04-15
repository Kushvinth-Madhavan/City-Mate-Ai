
City Relocation Advisor Chatbot
Instructions
Core Requirements
AI Agent Functionality
•Build an AI agent that solves the assigned use case problem
•Implement persistent memory across different chat sessions using Vector DB
•Integrate real-time data retrieval through relevant APIs based on your use case
•Ensure the agent can recall previous interactions and use them for context in new conversations
•Implement at least 2 use-case specific tools and memory-related tools

Technical Requirements
Your agent must demonstrate both:
•Long-term memory: Store and retrieve important information from previous conversations that persists across sessions, even after clearing chat history.
•Real-time knowledge: Access current data through APIs relevant to your use case.

Technology Options
LLM Providers (choose one)
•Gemini (Recommended)
•Groq

Embeddings Providers
•Gemini Embeddings(Recommended)
•Jina Embeddings

Vector Database (choose one)
•Pinecone (Recommended)
•Supabase (pgvector) (Recommended)
•Neon (pgvector)
•Neo4J (vector index)

Development Stack
Python Option
•Agno (Recommended)
•LangChain
•CrewAI
•LlamaIndex

JavaScript Option
•Vercel AI SDK (Recommended)
•Mastra.ai (Recommended)
•LangChain
•LlamaIndex

UI (Optional but Highly Preferred)
•Next.js (Recommended)
•React.js
•Any CSS libraries of your choice

Deployment (Optional)
•Vercel (Recommended)
•Netlify
•Render

Implementation Options
Option 1: With UI (Highly Preferred)
•Develop a clean, professional user interface
•Integrate your AI agent API with the frontend
•Deploy the application (optional but recommended)

Option 2: Without UI
•Demonstrate functionality through CLI or API testing tools (e.g., Postman)
•Provide clear documentation on how to test and use your agent

Development Approach
We recommend:
•First focus on completing the core AI agent functionality
•Then implement the UI and integration
•Finally deploy the application if possible

Timeline
•Final Submission Deadline is April 13, 2025
•Plan your time accordingly to ensure all core requirements are met and focus on completing core functionality first before adding additional features

Evaluation Criteria
•Functionality of the AI agent
•Quality of memory implementation
•Effective use of real-time data
•Code quality and organization
•UI implementation
•Deployment (optional but valued)

Note: You will receive another email with a link to submit your work. High preference will be given to candidates who implement AI agent functionality with UI.

Problem Statement
People considering relocation to a new city often struggle to evaluate locations based on their personal preferences and needs. Without guidance that remembers their specific priorities and constraints, they waste time researching the same factors repeatedly or miss important considerations.
Your task is to build an AI chatbot agent that helps users evaluate potential cities for relocation. The agent should provide information on cost of living, housing markets, job opportunities, quality of life factors, and neighborhood characteristics.
When users clear the chat and start a new conversation, the agent should recall important information from previous interactions such as career field, lifestyle preferences, family needs, budget constraints, and previously discussed locations. This stored information should be combined with real-time city data to provide personalized recommendations that reflect current housing markets, employment trends, and quality of life metrics, even after the chat has been cleared.

Example user queries:
•What are the latest housing market trends in the neighborhoods we discussed in Austin?
•How do recent reports rate the school districts in Denver compared to the education priorities we talked about?
•Based on my remote work situation, what are current experts saying about the most affordable tech hubs?
•What recent changes in public transportation would affect my commute in the cities we've discussed?
•How do current cost of living comparisons look between the top three cities that matched my preferences?

You could use APIs like:
•OpenStreetMap API
•Serper API
•Jina Reader API
•News API
Note : You can use any other relevant APIs for your use case, other than the above list.
