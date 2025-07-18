
'use client';

import * as React from 'react';
import type { AllItems, Observation, Inspection, Ptw } from '@/lib/types';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

interface ObservationState {
  observation: Observation[];
  inspection: Inspection[];
  ptw: Ptw[];
}

interface LoadingState {
  observation: boolean;
  inspection: boolean;
  ptw: boolean;
}

interface ErrorState {
    observation: string | null;
    inspection: string | null;
    ptw: string | null;
}

interface PaginationState {
    observation: boolean;
    inspection: boolean;
    ptw: boolean;
}

interface LastDocState {
    observation: QueryDocumentSnapshot<DocumentData> | null;
    inspection: QueryDocumentSnapshot<DocumentData> | null;
    ptw: QueryDocumentSnapshot<DocumentData> | null;
}

interface ObservationContextType {
  items: ObservationState;
  isLoading: LoadingState;
  error: ErrorState;
  hasMore: PaginationState;
  lastDoc: LastDocState;
  getObservationById: (id: string) => Observation | undefined;
  getInspectionById: (id: string) => Inspection | undefined;
  getPtwById: (id: string) => Ptw | undefined;
  setItems: (itemType: AllItems['itemType'], items: AllItems[] | ((prev: AllItems[]) => AllItems[])) => void;
  setIsLoading: (itemType: AllItems['itemType'], value: boolean) => void;
  setError: (itemType: AllItems['itemType'], message: string | null) => void;
  setHasMore: (itemType: AllItems['itemType'], value: boolean) => void;
  setLastDoc: (itemType: AllItems['itemType'], doc: QueryDocumentSnapshot<DocumentData> | null) => void;
  updateItem: (item: AllItems) => void;
  removeItem: (id: string, itemType: AllItems['itemType']) => void;
  addItem: (item: AllItems) => void;
}

export const ObservationContext = React.createContext<ObservationContextType | undefined>(undefined);

const initialState = {
  items: { observation: [], inspection: [], ptw: [] },
  isLoading: { observation: true, inspection: true, ptw: true },
  error: { observation: null, inspection: null, ptw: null },
  hasMore: { observation: false, inspection: false, ptw: false },
  lastDoc: { observation: null, inspection: null, ptw: null },
};

export function ObservationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItemsState] = React.useState<ObservationState>(initialState.items);
  const [isLoading, setIsLoadingState] = React.useState<LoadingState>(initialState.isLoading);
  const [error, setErrorState] = React.useState<ErrorState>(initialState.error);
  const [hasMore, setHasMoreState] = React.useState<PaginationState>(initialState.hasMore);
  const [lastDoc, setLastDocState] = React.useState<LastDocState>(initialState.lastDoc);


  const setItems = React.useCallback((itemType: AllItems['itemType'], newItems: AllItems[] | ((prev: AllItems[]) => AllItems[])) => {
    setItemsState(prev => ({
      ...prev,
      [itemType]: typeof newItems === 'function' ? newItems(prev[itemType]) : newItems,
    }));
  }, []);

  const setIsLoading = React.useCallback((itemType: AllItems['itemType'], value: boolean) => {
    setIsLoadingState(prev => ({
      ...prev,
      [itemType]: value,
    }));
  }, []);

  const setError = React.useCallback((itemType: AllItems['itemType'], message: string | null) => {
    setErrorState(prev => ({
      ...prev,
      [itemType]: message,
    }));
  }, []);

  const setHasMore = React.useCallback((itemType: AllItems['itemType'], value: boolean) => {
    setHasMoreState(prev => ({
      ...prev,
      [itemType]: value,
    }));
  }, []);
  
  const setLastDoc = React.useCallback((itemType: AllItems['itemType'], doc: QueryDocumentSnapshot<DocumentData> | null) => {
    setLastDocState(prev => ({
        ...prev,
        [itemType]: doc,
    }));
  }, []);

  const addItem = React.useCallback((newItem: AllItems) => {
    const itemType = newItem.itemType;
    setItemsState(prev => {
        const currentItems = prev[itemType] as AllItems[];
        if (currentItems.some(item => item.id === newItem.id)) return prev;
        const newItems = [newItem, ...currentItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return {
            ...prev,
            [itemType]: newItems
        };
    });
  }, []);
  
  const removeItem = React.useCallback((id: string, itemType: AllItems['itemType']) => {
    setItemsState(prev => ({
      ...prev,
      [itemType]: (prev[itemType] as AllItems[]).filter(item => item.id !== id),
    }));
  }, []);

  const updateItem = React.useCallback((updatedItem: AllItems) => {
    const itemType = updatedItem.itemType;
    setItemsState(prev => {
      const newItems = (prev[itemType] as AllItems[]).map(item =>
        item.id === updatedItem.id ? updatedItem : item
      );
      return { ...prev, [itemType]: newItems };
    });
  }, []);


  const getObservationById = React.useCallback((id: string): Observation | undefined => {
    return items.observation.find(item => item.id === id);
  }, [items.observation]);
  
  const getInspectionById = React.useCallback((id: string): Inspection | undefined => {
    return items.inspection.find(item => item.id === id);
  }, [items.inspection]);

  const getPtwById = React.useCallback((id: string): Ptw | undefined => {
    return items.ptw.find(item => item.id === id);
  }, [items.ptw]);

  const value = React.useMemo(() => ({
    items, 
    isLoading, 
    error,
    hasMore,
    lastDoc,
    setItems,
    setIsLoading,
    setError,
    setHasMore,
    setLastDoc,
    getObservationById, 
    getInspectionById, 
    getPtwById,
    updateItem,
    removeItem,
    addItem,
  }), [items, isLoading, error, hasMore, lastDoc, setItems, setIsLoading, setError, setHasMore, setLastDoc, getObservationById, getInspectionById, getPtwById, updateItem, removeItem, addItem]);

  return <ObservationContext.Provider value={value}>{children}</ObservationContext.Provider>;
}
