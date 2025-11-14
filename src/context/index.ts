/**
 * Frontend Context
 * إدارة الحالة العامة للتطبيق
 */

import React, { createContext, useContext, useState } from 'react';

interface AppContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  keysStatus: any;
  setKeysStatus: (status: any) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export default AppContext;
