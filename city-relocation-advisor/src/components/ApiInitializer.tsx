"use client";

import { useEffect } from 'react';
import { displayApiHealthDashboard } from '@/utils/api-tools';
import { initializeApp } from '@/utils/initialization';

interface ApiInitializerProps {
  onInitialized: (result: any) => void;
}

export default function ApiInitializer({ onInitialized }: ApiInitializerProps) {
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('🚀 Starting application initialization...');
        
        // Initialize the app
        const result = await initializeApp();
        
        // Display the API health dashboard
        await displayApiHealthDashboard(result.apiStatus);
        
        // Call the callback to update parent component state
        onInitialized(result);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        onInitialized({
          apiStatus: {
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
          },
          memoryOnly: true
        });
      }
    };

    initialize();
  }, [onInitialized]);

  // This component doesn't render anything visible
  return null;
} 