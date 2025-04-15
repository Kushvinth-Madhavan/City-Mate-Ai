import React, { createContext, useContext, ReactNode } from 'react';

// Define the API status structure
export interface APIStatus {
  gemini: boolean;
  radar: boolean;
  serper: boolean;
  newsApi: boolean;
  jinaReader: boolean;
  supabase: boolean;
  memoryOnly: boolean;
  proxy?: {
    enabled: boolean;
    url: string | null;
  };
}

// Create the context with default values
interface ApiContextType {
  apiStatus: APIStatus;
  dbStatus: boolean;
  memoryOnlyMode: boolean;
  isLoading: boolean;
  refreshApiStatus: () => Promise<void>;
}

const defaultContext: ApiContextType = {
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
  dbStatus: false,
  memoryOnlyMode: true,
  isLoading: true,
  refreshApiStatus: async () => {}
};

export const ApiContext = createContext<ApiContextType>(defaultContext);

// Custom hook to use the context
export const useApiStatus = () => useContext(ApiContext);

// Optional: Provider component for better encapsulation
interface ApiProviderProps {
  children: ReactNode;
  value: Omit<ApiContextType, 'refreshApiStatus'>;
  onRefresh?: () => Promise<void>;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ 
  children, 
  value,
  onRefresh = async () => {} 
}) => {
  return (
    <ApiContext.Provider value={{ ...value, refreshApiStatus: onRefresh }}>
      {children}
    </ApiContext.Provider>
  );
};

// Export a helper to wrap a component with offline awareness
export function withApiStatus<P extends object>(
  Component: React.ComponentType<P & { apiStatus: APIStatus }>
) {
  return (props: P) => {
    const { apiStatus } = useApiStatus();
    return <Component {...props} apiStatus={apiStatus} />;
  };
} 