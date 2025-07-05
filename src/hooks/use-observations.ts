
'use client';

import * as React from 'react';
import { useContext } from 'react';
import { collection, query, orderBy, where, onSnapshot, Unsubscribe, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AllItems } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { ObservationContext } from '@/contexts/observation-context';

const ITEMS_PER_PAGE = 20; // Load the 20 most recent items per collection

export function useObservations(projectId: string | null) {
  const context = useContext(ObservationContext);
  const { user } = useAuth();
  
  if (context === undefined) {
    throw new Error('useObservations must be used within an ObservationProvider');
  }

  const { setItems, setIsLoading, setError } = context;

  // By using a ref, we can compare the current projectId with the previous one
  // to avoid re-fetching data and clearing items unnecessarily on every re-render.
  const previousProjectIdRef = React.useRef<string | null>();

  React.useEffect(() => {
    // Only clear items and set loading state if the project has actually changed.
    if (previousProjectIdRef.current !== projectId) {
      setItems([]);
      setIsLoading(true);
    }
    previousProjectIdRef.current = projectId;

    if (!projectId || !user) {
      setIsLoading(false); // No project/user, so stop loading.
      // Clear items if we navigate away from a project (e.g., to /beranda)
      if(projectId === null) setItems([]); 
      return;
    }

    setError(null);

    const collectionsToQuery = ['observations', 'inspections', 'ptws'];
    const unsubscribes: Unsubscribe[] = [];
    
    // A map to hold all items from all collections, keyed by ID
    const allData = new Map<string, AllItems>();

    const processAndSetData = () => {
      const sortedData = Array.from(allData.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setItems(sortedData);
    };

    let initialLoadsPending = collectionsToQuery.length;
    
    collectionsToQuery.forEach(collName => {
        const q = query(
            collection(db, collName), 
            where('projectId', '==', projectId),
            orderBy('date', 'desc'),
            limit(ITEMS_PER_PAGE)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === "removed") {
                allData.delete(change.doc.id);
              } else {
                allData.set(change.doc.id, { ...change.doc.data(), id: change.doc.id } as AllItems);
              }
            });
            
            processAndSetData();
            
            // Only stop the main loading spinner after the first fetch from all collections completes.
            if (initialLoadsPending > 0) {
              initialLoadsPending--;
              if (initialLoadsPending === 0) {
                setIsLoading(false);
              }
            }

        }, (err) => {
            console.error(`Error on snapshot for ${collName}:`, err);
            setError(`Failed to load ${collName}.`);
            setIsLoading(false);
        });
        unsubscribes.push(unsubscribe);
    });
    
    // Cleanup on component unmount or when dependencies change
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [projectId, user, setItems, setIsLoading, setError]);

  return context;
}
