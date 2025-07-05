
'use client';

import * as React from 'react';
import { useContext }from 'react';
import { collection, query, orderBy, where, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AllItems } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { ObservationContext } from '@/contexts/observation-context';

/**
 * The master hook for fetching and managing real-time data for a given project context.
 * It listens to an entire collection for a project and keeps the central ObservationContext up-to-date.
 * It does NOT handle pagination; that is left to the UI components.
 */
export function useObservations(projectId: string | null, itemTypeFilter: AllItems['itemType']) {
  const context = useContext(ObservationContext);
  const { user } = useAuth();
  
  if (context === undefined) {
    throw new Error('useObservations must be used within an ObservationProvider');
  }

  const { items, setItems, isLoading, setIsLoading, setError } = context;

  const unsubscribeRef = React.useRef<Unsubscribe | null>(null);
  
  React.useEffect(() => {
    // Stop listening to the old query when the component unmounts or dependencies change.
    if (unsubscribeRef.current) {
        unsubscribeRef.current();
    }

    if (!projectId || !user) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    const collectionName = `${itemTypeFilter}s`;
    
    const q = query(
        collection(db, collectionName),
        where('projectId', '==', projectId),
        orderBy('date', 'desc')
    );

    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
        const serverItems: AllItems[] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AllItems));
        
        // Merge server data with any existing optimistic items from the local state
        setItems(prevLocalItems => {
            // Keep optimistic items that haven't been confirmed by the server yet
            const optimisticItems = prevLocalItems.filter(
                item => item.optimisticState === 'uploading' && !serverItems.some(s_item => s_item.referenceId === item.referenceId)
            );
            const finalItems = [...optimisticItems, ...serverItems];
            // The sort is implicitly handled by the query's `orderBy`
            return finalItems;
        });

        setIsLoading(false);
    }, (err) => {
        console.error(err);
        setError(`Failed to load ${itemTypeFilter}s.`);
        setIsLoading(false);
    });

    return () => {
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }
    };
  // We only want to re-run this ENTIRE effect if the project or filter changes.
  // The context setters are stable and do not need to be dependencies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, itemTypeFilter, user?.uid]);

  // This hook now returns the full context, letting the component decide how to use it.
  return context;
}
