
'use client';

import * as React from 'react';
import { collection, query, orderBy, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AllItems, Observation, Inspection, Ptw } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

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
        return newItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

  const value = React.useMemo(() => ({
    items, 
    isLoading, 
    error,
    getObservationById, 
    getInspectionById, 
    getPtwById,
    updateItem,
    removeItem,
    addItem,
    // Internal setters to be used by the hook
    _setItems: setItems,
    _setIsLoading: setIsLoading,
    _setError: setError,
  }), [items, isLoading, error, getObservationById, getInspectionById, getPtwById, updateItem, removeItem, addItem]);

  return <ObservationContext.Provider value={value}>{children}</ObservationContext.Provider>;
}

export function useObservations(projectId: string | null) {
  const context = React.useContext(ObservationContext);
  const { user } = useAuth();
  
  if (context === undefined) {
    throw new Error('useObservations must be used within an ObservationProvider');
  }

  const { _setItems, _setIsLoading, _setError } = context as any;

  React.useEffect(() => {
    if (!projectId || !user) {
      _setItems([]);
      _setIsLoading(false);
      return;
    }

    _setIsLoading(true);

    const collectionsToQuery = ['observations', 'inspections', 'ptws'];
    const unsubscribes: Unsubscribe[] = [];
    let allData: AllItems[] = [];

    const processAndSetData = () => {
      allData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      _setItems([...allData]);
    };

    let collectionsLoaded = 0;
    
    collectionsToQuery.forEach(collName => {
        const q = query(
            collection(db, collName), 
            where('projectId', '==', projectId),
            where('scope', '==', 'project'), // Ensure we only get project-scoped items
            orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newDocs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as AllItems);
            
            // Atomically update the portion of data for this collection
            allData = [
                ...allData.filter(d => d.itemType !== collName.slice(0, -1)),
                ...newDocs
            ];
            
            processAndSetData();
            
            if (collectionsLoaded < collectionsToQuery.length) {
                collectionsLoaded++;
                if (collectionsLoaded === collectionsToQuery.length) {
                    _setIsLoading(false);
                }
            }

        }, (err) => {
            console.error(`Error on snapshot for ${collName}:`, err);
            _setError(`Failed to load ${collName}.`);
            _setIsLoading(false);
        });
        unsubscribes.push(unsubscribe);
    });
    
    // Cleanup function: this is critical. It runs when the component unmounts
    // or when projectId/user changes, preventing memory leaks and duplicate listeners.
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [projectId, user, _setItems, _setIsLoading, _setError]);

  return context;
}
