
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
        // First, check if the real item already exists by its final ID.
        const existingIndex = prevItems.findIndex(item => item.id === updatedItem.id);
        
        if (existingIndex !== -1) {
            // It's a simple update.
            const newItems = [...prevItems];
            newItems[existingIndex] = updatedItem;
            return newItems;
        }

        // If it doesn't exist, check if it's a server-confirmed item replacing an optimistic one.
        // The optimistic item will have an ID starting with 'optimistic-' but the same referenceId.
        const optimisticIndex = prevItems.findIndex(item => 
            item.optimisticState === 'uploading' && item.referenceId === updatedItem.referenceId
        );
        
        if (optimisticIndex !== -1) {
            const newItems = [...prevItems];
            newItems[optimisticIndex] = updatedItem;
            return newItems;
        }

        // If no existing or optimistic item is found, it's a new item from a different client. Add and sort.
        return [...prevItems, updatedItem].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  }, []);

  const removeItem = React.useCallback((id: string) => {
      setItems(prev => prev.filter(item => item.id !== id));
  }, []);
  
  const addItem = React.useCallback((newItem: AllItems) => {
    // This function is exclusively for adding optimistic items to the UI instantly.
    setItems(prev => {
      // Prevent adding duplicate optimistic items if the user clicks submit multiple times.
      if (prev.some(item => item.id === newItem.id)) {
          return prev;
      }
      // Add the new item to the top and re-sort to ensure correct placement.
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
