'use client';

import React from 'react';

export function InitializationLoader() {
  const [isInitializing, setIsInitializing] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (!isInitializing) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <h1 className="text-4xl font-bold text-white text-center mb-8">CityMate</h1>
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center space-x-3 justify-center mb-6">
            <div className="flex space-x-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <span className="text-blue-400 font-medium">
              Initializing AI Systems...
            </span>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>Loading models...</span>
                <div className="w-48 bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 animate-progress-bar" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>Connecting to APIs...</span>
                <div className="w-48 bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 animate-progress-bar" style={{ animationDelay: '0.5s' }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>Preparing resources...</span>
                <div className="w-48 bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 animate-progress-bar" style={{ animationDelay: '1s' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 