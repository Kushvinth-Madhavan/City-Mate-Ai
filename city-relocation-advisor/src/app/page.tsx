import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-3xl w-full space-y-8 text-center">
        <h1 className="text-5xl font-bold mb-8">CityMate</h1>
        <h2 className="text-3xl font-semibold mb-6">Your AI-Powered City Relocation Advisor</h2>
        
        <p className="text-xl mb-8">
          Looking for the perfect city to call home? CityMate helps you find your ideal location based on your 
          preferences, lifestyle, and needs.
        </p>
        
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl mb-8">
          <h3 className="text-2xl font-medium mb-4">Start Your Relocation Journey</h3>
          <p className="mb-6">
            Chat with our AI advisor to explore housing markets, job opportunities, 
            quality of life, and more for cities around the world.
          </p>
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center">
            <Link 
              href="/chat" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg inline-block transition-colors"
            >
              Start Chatting
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-xl font-medium mb-2">Real-time Data</h3>
            <p>Access current information about housing, jobs, and neighborhood characteristics</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-xl font-medium mb-2">Personalized Insights</h3>
            <p>Get recommendations tailored to your unique preferences and circumstances</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-xl font-medium mb-2">Compare Cities</h3>
            <p>Evaluate multiple locations to find your perfect match</p>
          </div>
        </div>
      </div>
    </main>
  );
}
