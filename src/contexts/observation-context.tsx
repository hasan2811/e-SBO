
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
        // Find and remove the optimistic placeholder if it exists.
        // It's identified by having an `optimisticState` and a matching `referenceId`.
        const filteredItems = prevItems.filter(item => 
            !(item.optimisticState && item.referenceId && item.referenceId === updatedItem.referenceId)
        );

        // Now, find the real item's index in the filtered list.
        const index = filteredItems.findIndex(item => item.id === updatedItem.id);

        if (index === -1) {
            // If the item doesn't exist, it's a new item. Add it.
            return [...filteredItems, updatedItem].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        
        // It's an update to an existing item, so replace it at its index.
        const newItems = [...filteredItems];
        newItems[index] = updatedItem;
        return newItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  }, []);

  const removeItem = React.useCallback((id: string) => {
      setItems(prev => prev.filter(item => item.id !== id));
  }, []);
  
  const addItem = React.useCallback((newItem: AllItems) => {
    // This function is now specifically for adding optimistic items.
    setItems(prev => {
      if (prev.some(item => item.id === newItem.id)) {
          return prev; // Prevent adding duplicate optimistic items
      }
      // Add the new item and re-sort.
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
