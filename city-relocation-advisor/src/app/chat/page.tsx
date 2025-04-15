'use client'

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
  apiUsage?: {
    groq: boolean;
    radar: boolean;
    serper: boolean;
    newsApi: boolean;
    jinaReader: boolean;
  };
};

const DEMO_QUESTION = "I'm a software engineer with a family of four, including two elementary school children. We're considering relocating from San Francisco to either Austin, Denver, or Raleigh. We value good public schools, a reasonable commute, affordable housing (under $600K for a 3BR home), and outdoor activities. I work remotely but need access to a good tech community. My spouse is in healthcare. Can you compare these three cities and recommend which neighborhoods would be best for us based on our priorities? Please consider cost of living adjustments from San Francisco, school quality, healthcare job opportunities, and the strength of the local tech scene.";

// Add API usage report component
const ApiUsageReport = ({ apiUsage }: { apiUsage: Message['apiUsage'] }) => {
  if (!apiUsage) return null;

  const apis = [
    {
      name: 'Google Gemini AI',
      used: apiUsage.groq,
      description: 'Primary LLM for response generation'
    },
    {
      name: 'SerpAPI (Google Search)',
      used: apiUsage.serper,
      description: 'Web search and data enrichment'
    },
    {
      name: 'Parallel Execution',
      used: true, // Always true as we're using Promise.all
      description: 'Concurrent API calls'
    },
    {
      name: 'News API',
      used: apiUsage.newsApi,
      description: 'City-specific news'
    },
    {
      name: 'Radar Location API',
      used: apiUsage.radar,
      description: 'Geolocation data'
    },
    {
      name: 'Jina AI',
      used: apiUsage.jinaReader,
      description: 'Web content summarization'
    }
  ];

  return (
    <div className="bg-gray-800 p-4 rounded-lg mb-4">
      <h3 className="text-lg font-semibold text-blue-400 mb-2">API Usage Report</h3>
      <div className="space-y-1 text-sm">
        {apis.map((api, index) => (
          <div key={index} className="flex items-center">
            <span className={`${api.used ? 'text-green-400' : 'text-red-400'} mr-2`}>
              {api.used ? '✅' : '❌'}
            </span>
            <span className="text-gray-300">{api.name}:</span>
            <span className="text-gray-400 ml-2">
              {api.used ? `Used (${api.description})` : 'Not used'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Add LoadingAnimation component
const LoadingAnimation = ({ type }: { type: 'api' | 'thinking' }) => {
  return (
    <div className={`bg-gray-800 p-6 rounded-lg mr-8 ${type === 'api' ? 'mx-auto max-w-lg text-center' : ''}`}>
      <div className="flex items-center space-x-3">
        <div className="flex space-x-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 bg-blue-500 rounded-full animate-bounce`}
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <span className="text-blue-400 font-medium">
          {type === 'api' ? 'Initializing AI Systems...' : 'Processing your request...'}
        </span>
      </div>
      {type === 'api' && (
        <div className="mt-4 text-sm text-gray-400">
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-32 bg-gray-700 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-progress-bar" style={{ width: '0%' }} />
              </div>
              <span className="ml-2">Loading models...</span>
            </div>
            <div className="flex items-center">
              <div className="w-32 bg-gray-700 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 animate-progress-bar" style={{ width: '0%', animationDelay: '0.5s' }} />
              </div>
              <span className="ml-2">Connecting to APIs...</span>
            </div>
            <div className="flex items-center">
              <div className="w-32 bg-gray-700 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 animate-progress-bar" style={{ width: '0%', animationDelay: '1s' }} />
              </div>
              <span className="ml-2">Preparing resources...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add helper function to process response text
const processResponseText = (text: string) => {
  // Remove the thinking part if it exists
  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    // Remove the thinking part and any extra newlines that might be left
    return text.replace(/<think>[\s\S]*?<\/think>\s*/, '').trim();
  }
  return text;
};

export default function Chat() {
  const searchParams = useSearchParams();
  const isTest = searchParams.get('test') === 'true';
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi there! I\'m CityMate, your AI city relocation advisor. Please enter your current location and desired location above to get started.',
      createdAt: new Date()
    }
  ]);
  const [currentLocation, setCurrentLocation] = useState('');
  const [desiredLocation, setDesiredLocation] = useState('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLocation.trim() || !desiredLocation.trim()) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Please enter both your current location and desired location to proceed.',
        createdAt: new Date()
      }]);
      return;
    }
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      createdAt: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call API endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages,
          message: input,
          currentLocation,
          desiredLocation
        }),
      });

      const data = await response.json();
      
      if (data.response && data.response.text) {
        // Process the response text to remove thinking part
        const processedText = processResponseText(data.response.text);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: processedText,
          createdAt: new Date(),
          apiUsage: data.response.apiUsage || {
            groq: false,
            radar: false,
            serper: false,
            newsApi: false,
            jinaReader: false
          }
        }]);
      } else if (data.error) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Error: ${data.error}`,
          createdAt: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        createdAt: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="p-4 bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <Link href="/" className="text-2xl font-bold">CityMate</Link>
            <h1 className="text-xl">City Relocation Advisor</h1>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">Current Location</label>
              <input
                type="text"
                value={currentLocation}
                onChange={(e) => setCurrentLocation(e.target.value)}
                placeholder="Enter your current city..."
                className="w-full p-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">Desired Location</label>
              <input
                type="text"
                value={desiredLocation}
                onChange={(e) => setDesiredLocation(e.target.value)}
                placeholder="Enter your desired city..."
                className="w-full p-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`p-4 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-blue-600 ml-8' 
                  : 'bg-gray-800 mr-8'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="markdown-content prose prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                  {message.apiUsage && <ApiUsageReport apiUsage={message.apiUsage} />}
                </div>
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          ))}
          {isLoading && (
            <LoadingAnimation type="thinking" />
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about housing, jobs, lifestyle..."
              className="flex-1 p-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim() || !currentLocation.trim() || !desiredLocation.trim()} 
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 p-3 rounded-lg font-medium transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
} 