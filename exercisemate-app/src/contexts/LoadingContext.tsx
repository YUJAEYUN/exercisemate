'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage?: string;
  setLoading: (loading: boolean, message?: string) => void;
  withLoading: <T>(
    asyncFn: () => Promise<T>,
    message?: string
  ) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | undefined>();

  const setLoading = (loading: boolean, message?: string) => {
    setIsLoading(loading);
    setLoadingMessage(message);
  };

  const withLoading = async <T,>(
    asyncFn: () => Promise<T>,
    message?: string
  ): Promise<T> => {
    try {
      setLoading(true, message);
      return await asyncFn();
    } finally {
      setLoading(false);
    }
  };

  const value: LoadingContextType = {
    isLoading,
    loadingMessage,
    setLoading,
    withLoading
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="text-gray-700">
                {loadingMessage || '처리 중...'}
              </span>
            </div>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}
