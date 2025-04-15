"use client";

import { useEffect, useState, Suspense } from 'react';
import { ApiProvider, APIStatus } from '@/utils/api-context';
import React from "react";
import dynamic from 'next/dynamic';

// Export a status tracking object that can be used across the app
export let apiStatus = {
  initialized: false,
  gemini: false,
  radar: false,
  serper: false,
  newsApi: false,
  jinaReader: false,
  supabase: false,
  memoryOnly: false,
  lastChecked: null as Date | null
};

// Export a function to check API status
export function getApiStatus() {
  return { ...apiStatus, lastChecked: apiStatus.lastChecked };
}

// Dynamically import the heavy API initialization logic
const ApiInitializer = dynamic(
  () => import('./ApiInitializer'),
  { ssr: false, loading: () => <p>Loading API initializer...</p> }
);

export default function ClientInitializer({ children }: { children: React.ReactNode }) {
  const [apiStatus, setApiStatus] = useState<APIStatus>({
    gemini: false,
    radar: false,
    serper: false,
    newsApi: false,
    jinaReader: false,
    supabase: false,
    memoryOnly: true,
    proxy: {
      enabled: false,
      url: null
    }
  });
  const [dbStatus, setDbStatus] = useState(false);
  const [memoryOnlyMode, setMemoryOnlyMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [initializationStarted, setInitializationStarted] = useState(false);

  // Create a function to update API status from the dynamically loaded component
  const updateApiStatus = (newStatus: any) => {
    setApiStatus(newStatus.apiStatus);
    setDbStatus(newStatus.apiStatus.supabase);
    setMemoryOnlyMode(newStatus.memoryOnly);
    setIsLoading(false);
  };

  useEffect(() => {
    // Only set that initialization has started, actual work happens in the dynamic component
    setInitializationStarted(true);
  }, []);

  // Handle refresh as an async function to match the expected type
  const handleRefresh = async (): Promise<void> => {
    return new Promise<void>((resolve) => {
      setIsLoading(true);
      setInitializationStarted(false);
      // Force re-render of the dynamic component
      setTimeout(() => {
        setInitializationStarted(true);
        resolve();
      }, 0);
    });
  };

  return (
    <ApiProvider 
      value={{ 
        apiStatus, 
        dbStatus, 
        memoryOnlyMode, 
        isLoading 
      }}
      onRefresh={handleRefresh}
    >
      {initializationStarted && (
        <Suspense fallback={
          <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <div className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-800">Initializing application...</p>
              <p className="text-sm text-gray-600 mt-2">Checking API connections and database status</p>
            </div>
          </div>
        }>
          <ApiInitializer onInitialized={updateApiStatus} />
        </Suspense>
      )}
      {children}
    </ApiProvider>
  );
} 