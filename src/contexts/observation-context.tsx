'use client';

import * as React from 'react';
import type { AllItems, Observation, Inspection, Ptw } from '@/lib/types';

interface ObservationContextType {
  items: AllItems[];
  isLoading: boolean;
  error: string | null;
  getObservationById: (id: string) => Observation | undefined;
  getInspectionById: (id: string) => Inspection | undefined;
  getPtwById: (id: string) => Ptw | undefined;
  setItems: React.Dispatch<React.SetStateAction<AllItems[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  updateItem: (item: AllItems) => void;
  removeItem: (id: string) => void;
  addItem: (item: AllItems) => void;
}

export const ObservationContext = React.createContext<ObservationContextType | undefined>(undefined);

export function ObservationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<AllItems[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const updateItem = React.useCallback((updatedItem: AllItems) => {
    setItems(prevItems => {
        const index = prevItems.findIndex(item => item.id === updatedItem.id);
        if (index === -1) {
          const newItems = [updatedItem, ...prevItems];
          return newItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        const newItems = [...prevItems];
        newItems[index] = updatedItem;
        return newItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  }, []);

  const removeItem = React.useCallback((id: string) => {
      setItems(prev => prev.filter(item => item.id !== id));
  }, []);
  
  const addItem = React.useCallback((newItem: AllItems) => {
    setItems(prev => {
      if (prev.some(item => item.id === newItem.id)) {
        return prev;
      }
      return [newItem, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  }, []);

  const getObservationById = React.useCallback((id: string): Observation | undefined => {
    return items.find(item => item.id === id && item.itemType === 'observation') as Observation | undefined;
  }, [items]);
  
  const getInspectionById = React.useCallback((id: string): Inspection | undefined => {
    return items.find(item => item.id === id && item.itemType === 'inspection') as Inspection | undefined;
  }, [items]);

  const getPtwById = React.useCallback((id: string): Ptw | undefined => {
    return items.find(item => item.id === id && item.itemType === 'ptw') as Ptw | undefined;
  }, [items]);

  const value = React.useMemo(() => ({
    items, 
    isLoading, 
    error,
    setItems,
    setIsLoading,
    setError,
    getObservationById, 
    getInspectionById, 
    getPtwById,
    updateItem,
    removeItem,
    addItem,
  }), [items, isLoading, error, setItems, setIsLoading, setError, getObservationById, getInspectionById, getPtwById, updateItem, removeItem, addItem]);

  return <ObservationContext.Provider value={value}>{children}</ObservationContext.Provider>;
}
