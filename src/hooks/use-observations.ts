
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

  const { setItems, setIsLoading, setError } = context;

  const unsubscribeRef = React.useRef<Unsubscribe | null>(null);
  
  React.useEffect(() => {
    // Stop listening to any previous query when dependencies change.
    if (unsubscribeRef.current) {
        unsubscribeRef.current();
    }

    // If the user is not logged in, we must clear the data and stop.
    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    // If there is a user, but no project is selected (e.g., on the project hub or during navigation),
    // we should NOT fetch anything. We also DON'T clear the data here, which is the key fix.
    // This allows for seamless navigation back and forth.
    if (!projectId) {
      // Intentionally do not clear items here.
      setIsLoading(false);
      return;
    }
    
    // Start loading only when we are sure we are fetching for a valid project.
    setIsLoading(true);
    
    const collectionName = `${itemTypeFilter}s`;
    
    const q = query(
        collection(db, collectionName),
        where('projectId', '==', projectId),
        orderBy('date', 'desc')
    );

    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
        const serverItems: AllItems[] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AllItems));
        
        // Atomically replace the context's items with the new data from the snapshot.
        // This is the single source of truth for the feed.
        setItems(serverItems);

        setIsLoading(false);
    }, (err) => {
        console.error(err);
        setError(`Failed to load ${itemTypeFilter}s.`);
        setIsLoading(false);
    });

    // Cleanup function to unsubscribe when the component unmounts or dependencies change.
    return () => {
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }
    };
  // The context setters are stable and do not need to be dependencies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, itemTypeFilter, user?.uid]);

  // This hook now returns the full context, letting the component decide how to use it.
  return context;
}
