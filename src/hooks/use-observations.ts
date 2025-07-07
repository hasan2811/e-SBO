
'use client';

import * as React from 'react';
import { collection, query, orderBy, where, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AllItems } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { ObservationContext } from '@/contexts/observation-context';

/**
 * A hook that ensures data for a specific feed type is being fetched and kept up-to-date in the central context.
 * This hook does not return anything; its sole purpose is to trigger and manage a Firestore listener.
 * Components should read data directly from the ObservationContext.
 */
export function useObservations(projectId: string | null, itemTypeFilter: AllItems['itemType']) {
  const context = React.useContext(ObservationContext);
  const { user } = useAuth();
  
  if (context === undefined) {
    throw new Error('useObservations must be used within an ObservationProvider');
  }

  const { setItems, setIsLoading, setError } = context;
  const unsubscribeRef = React.useRef<Unsubscribe | null>(null);

  React.useEffect(() => {
    // Clean up the previous listener when dependencies change.
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // If there's no user or no project, clear the specific item type and stop loading.
    if (!user || !projectId) {
      setItems(itemTypeFilter, []);
      setIsLoading(itemTypeFilter, false);
      return;
    }

    // Set loading state for the specific feed type.
    setIsLoading(itemTypeFilter, true);
    setError(itemTypeFilter, null);
    
    const collectionName = `${itemTypeFilter}s`;
    
    try {
      const q = query(
          collection(db, collectionName),
          where('projectId', '==', projectId),
          orderBy('date', 'desc')
      );

      // Set up the listener for the specific feed type.
      unsubscribeRef.current = onSnapshot(q, (snapshot) => {
          const serverItems: AllItems[] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AllItems));
          // Update only the relevant slice of the state in the context.
          setItems(itemTypeFilter, serverItems);
          setIsLoading(itemTypeFilter, false);
      }, (err) => {
          console.error(`[useObservations] Firestore snapshot error for ${collectionName}:`, err);
          setError(itemTypeFilter, `Gagal memuat ${collectionName}.`);
          setIsLoading(itemTypeFilter, false);
      });
    } catch (err) {
      console.error(`[useObservations] Error creating query for ${collectionName}:`, err);
      setError(itemTypeFilter, `Terjadi kesalahan saat menyiapkan data.`);
      setIsLoading(itemTypeFilter, false);
    }

    // Final cleanup for when the component unmounts or dependencies change.
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [projectId, itemTypeFilter, user, setItems, setIsLoading, setError]);
}
