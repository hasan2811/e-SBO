
'use client';

import * as React from 'react';
import { collection, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AllItems, Observation, Inspection, Ptw } from '@/lib/types';

interface ObservationContextType {
  items: AllItems[];
  isLoading: boolean;
  error: string | null;
  getObservationById: (id: string) => Observation | undefined;
  getInspectionById: (id: string) => Inspection | undefined;
  getPtwById: (id: string) => Ptw | undefined;
  updateItem: (item: AllItems) => void;
  removeItem: (id: string) => void;
  addItem: (item: AllItems) => void;
}

const ObservationContext = React.createContext<ObservationContextType | undefined>(undefined);

const listeners = new Map<string, () => void>();

export function ObservationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<AllItems[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const updateItem = React.useCallback((updatedItem: AllItems) => {
    setItems(prevItems => {
        const index = prevItems.findIndex(item => item.id === updatedItem.id);
        if (index === -1) return prevItems;
        const newItems = [...prevItems];
        newItems[index] = updatedItem;
        return newItems;
    });
  }, []);

  const removeItem = React.useCallback((id: string) => {
      setItems(prev => prev.filter(item => item.id !== id));
  }, []);
  
  const addItem = React.useCallback((newItem: AllItems) => {
    setItems(prev => [newItem, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
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

  // This internal state is managed by the useObservations hook now
  const internalSetters = React.useRef({
    _setItems: setItems,
    _setIsLoading: setIsLoading,
    _setError: setError,
  }).current;

  const value = React.useMemo(() => ({
    items, 
    isLoading, 
    error,
    getObservationById, 
    getInspectionById, 
    getPtwById,
    updateItem,
    removeItem,
    addItem
  }), [items, isLoading, error, getObservationById, getInspectionById, getPtwById, updateItem, removeItem, addItem]);

  return <ObservationContext.Provider value={{...value, ...internalSetters}}>{children}</ObservationContext.Provider>;
}

export function useObservations(projectId: string | null) {
  const context = React.useContext(ObservationContext);
  if (context === undefined) {
    throw new Error('useObservations must be used within an ObservationProvider');
  }

  const { _setItems, _setIsLoading, _setError } = context as any;

  React.useEffect(() => {
    if (!projectId) {
      _setItems([]);
      _setIsLoading(false);
      return;
    }

    if (listeners.has(projectId)) {
      return;
    }

    _setIsLoading(true);

    const collectionsToQuery = ['observations', 'inspections', 'ptws'];
    let allData: AllItems[] = [];
    let initialLoads = 0;

    const allUnsubscribes: (() => void)[] = [];

    const processSnapshot = () => {
      allData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      _setItems([...allData]);
    };
    
    collectionsToQuery.forEach(collName => {
        // Updated query to use orderBy for performance and to match the index
        const q = query(collection(db, collName), where('projectId', '==', projectId), orderBy('date', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newDocs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as AllItems);
            
            // Atomically update the portion of the data for this collection
            allData = [
                ...allData.filter(d => d.itemType !== collName.slice(0, -1)),
                ...newDocs
            ];
            
            processSnapshot();

            if (initialLoads < collectionsToQuery.length) {
                initialLoads++;
                if (initialLoads === collectionsToQuery.length) {
                    _setIsLoading(false);
                }
            }
        }, (err) => {
            console.error(`Error on snapshot for ${collName}:`, err);
            _setError(`Failed to load ${collName}.`);
            _setIsLoading(false);
        });
        allUnsubscribes.push(unsubscribe);
    });

    const cleanup = () => {
        allUnsubscribes.forEach(unsub => unsub());
        listeners.delete(projectId);
    };

    listeners.set(projectId, cleanup);

    return () => {
      // This is the key cleanup that runs when the component unmounts or projectId changes
      // We retrieve our specific cleanup function from the map and execute it.
      const currentCleanup = listeners.get(projectId);
      if (currentCleanup) {
        currentCleanup();
      }
    };
  }, [projectId, _setItems, _setIsLoading, _setError]);

  return context;
}
