import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ApiRequest } from '../types';

interface ApiLogContextType {
  requests: ApiRequest[];
  addRequest: (request: ApiRequest) => void;
  clearRequests: () => void;
}

const ApiLogContext = createContext<ApiLogContextType | null>(null);

export function ApiLogProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<ApiRequest[]>([]);

  const addRequest = useCallback((request: ApiRequest) => {
    setRequests((prev) => [...prev, request]);
  }, []);

  const clearRequests = useCallback(() => {
    setRequests([]);
  }, []);

  return (
    <ApiLogContext.Provider value={{ requests, addRequest, clearRequests }}>
      {children}
    </ApiLogContext.Provider>
  );
}

export function useApiLog() {
  const context = useContext(ApiLogContext);
  if (!context) {
    throw new Error('useApiLog must be used within an ApiLogProvider');
  }
  return context;
}
