
'use client';

import * as React from 'react';
import { collection, query, orderBy, where, onSnapshot, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { AllItems, Scope, Observation, Inspection, Ptw } from '@/lib/types';
import { usePathname } from 'next/navigation';

interface ObservationContextType {
  items: AllItems[];
  isLoading: boolean;
  error: string | null;
  updateItem: (item: AllItems) => void;
  removeItem: (itemId: string) => void;
  getObservationById: (id: string) => Observation | undefined;
  getInspectionById: (id: string) => Inspection | undefined;
  getPtwById: (id: string) => Ptw | undefined;
}

export const ObservationContext = React.createContext<ObservationContextType | undefined>(undefined);

export function ObservationProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth();
  const pathname = usePathname();

  const [items, setItems] = React.useState<AllItems[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  const mode: 'private' | 'project' = pathname.startsWith('/proyek') ? 'project' : 'private';
  const projectId = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/)?.[1] || null;

  const updateItem = React.useCallback((updatedItem: AllItems) => {
    setItems(prevItems => prevItems.map(item => item.id === updatedItem.id ? updatedItem : item));
  }, []);

  const removeItem = React.useCallback((itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  }, []);

  React.useEffect(() => {
    if (!user) {
        setItems([]);
        setIsLoading(false);
        return;
    }
    
    setIsLoading(true);
    
    const collectionsToQuery = ['observations', 'inspections', 'ptws'];
    const unsubscribes: (() => void)[] = [];

    const fetchData = async () => {
        try {
            const allPromises = collectionsToQuery.map(async (collName) => {
                let q = query(collection(db, collName));
                
                if (mode === 'project' && projectId) {
                    q = query(q, where('projectId', '==', projectId));
                } else if (mode === 'private') {
                    q = query(q, where('scope', '==', 'private'), where('userId', '==', user.uid));
                } else {
                    return []; // Don't query if conditions aren't met
                }

                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as AllItems);
            });

            const results = await Promise.all(allPromises);
            const allData = results.flat();
            allData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setItems(allData);

        } catch (e: any) {
            if (e.code === 'failed-precondition') {
                setError("Database query failed. Please ensure all required indexes are built in the Firebase Console.");
                console.error("Firestore index missing error. Please verify the required composite indexes.", e);
            } else {
                console.error("Failed to fetch items:", e);
                setError("Failed to load data. Please check your connection.");
            }
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch
    fetchData();

    // Setup listeners for real-time updates
    collectionsToQuery.forEach(collName => {
      let q = query(collection(db, collName), orderBy('date', 'desc'));

      if (mode === 'project' && projectId) {
        q = query(q, where('projectId', '==', projectId));
      } else if (mode === 'private') {
        q = query(q, where('scope', '==', 'private'), where('userId', '==', user.uid));
      } else {
        return;
      }
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        // Just refetch all data to ensure sorting is correct across collections
        fetchData();
      }, (err) => {
        console.error(`Error on snapshot for ${collName}:`, err);
      });
      unsubscribes.push(unsubscribe);
    });


    return () => unsubscribes.forEach(unsub => unsub());

  }, [mode, projectId, user]);

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
    items, isLoading, error,
    updateItem, removeItem,
    getObservationById, getInspectionById, getPtwById
  }), [
      items, isLoading, error,
      updateItem, removeItem,
      getObservationById, getInspectionById, getPtwById
  ]);

  return <ObservationContext.Provider value={value}>{children}</ObservationContext.Provider>;
}
