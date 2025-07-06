
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
 * It listens to a collection for a specific project and keeps the central ObservationContext up-to-date.
 * When the context (projectId or itemTypeFilter) changes, it clears the old data and fetches the new.
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
    // Always clean up the previous listener when dependencies change.
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // If there's no user or no project selected, there's nothing to fetch.
    // Clear the items and set loading to false.
    if (!user || !projectId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    // A fetch is about to happen. Clear old items immediately and set loading state.
    // This prevents flashes of stale content from a previous page.
    setItems([]);
    setIsLoading(true);
    setError(null);
    
    const collectionName = `${itemTypeFilter}s`;
    
    try {
      const q = query(
          collection(db, collectionName),
          where('projectId', '==', projectId),
          orderBy('date', 'desc')
      );

      unsubscribeRef.current = onSnapshot(q, (snapshot) => {
          const serverItems: AllItems[] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AllItems));
          setItems(serverItems);
          setIsLoading(false);
      }, (err) => {
          console.error(`[useObservations] Firestore snapshot error for ${collectionName}:`, err);
          setError(`Gagal memuat ${collectionName}.`);
          setItems([]);
          setIsLoading(false);
      });
    } catch (err) {
      console.error(`[useObservations] Error creating query for ${collectionName}:`, err);
      setError(`Terjadi kesalahan saat menyiapkan data.`);
      setItems([]);
      setIsLoading(false);
    }

    // Final cleanup function for when the component unmounts.
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  // We include the setters in the dependency array for correctness,
  // although they are stable and won't cause re-renders.
  }, [projectId, itemTypeFilter, user, setItems, setIsLoading, setError]);

  // This hook now returns the full context, letting the component decide how to use it.
  return context;
}
