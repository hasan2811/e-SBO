
'use client';

import * as React from 'react';
import { collection, query, orderBy, where, onSnapshot, type Unsubscribe, limit, startAfter, QueryConstraint, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AllItems } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { ObservationContext } from '@/contexts/observation-context';

export interface FeedFilters {
    status: string;
    riskLevel?: string;
    searchTerm?: string;
}

/**
 * A hook that ensures data for a specific feed type is being fetched and kept up-to-date in the central context.
 * This hook now supports server-side filtering and pagination.
 */
export function useObservations(
    projectId: string | null,
    itemTypeFilter: AllItems['itemType'],
    filters: FeedFilters,
    pageSize: number,
    lastDoc: QueryDocumentSnapshot<DocumentData> | null
) {
  const context = React.useContext(ObservationContext);
  const { user } = useAuth();
  
  if (context === undefined) {
    throw new Error('useObservations must be used within an ObservationProvider');
  }

  const { setItems, setIsLoading, setError, setHasMore, setLastDoc } = context;
  const unsubscribeRef = React.useRef<Unsubscribe | null>(null);

  React.useEffect(() => {
    // Clean up the previous listener when dependencies change.
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!user || !projectId) {
      setItems(itemTypeFilter, []);
      setIsLoading(itemTypeFilter, false);
      return;
    }

    // On filter change, reset the list and start from the beginning.
    // The `lastDoc` dependency ensures this runs when filters change.
    if (lastDoc === null) { 
        setItems(itemTypeFilter, []);
    }
    
    setIsLoading(itemTypeFilter, true);
    setError(itemTypeFilter, null);
    
    const collectionName = `${itemTypeFilter}s`;
    
    try {
        const constraints: QueryConstraint[] = [
            where('projectId', '==', projectId),
        ];

        if (filters.status !== 'all') {
            constraints.push(where('status', '==', filters.status));
        }
        if (itemTypeFilter === 'observation' && filters.riskLevel && filters.riskLevel !== 'all') {
            constraints.push(where('riskLevel', '==', filters.riskLevel));
        }

        constraints.push(orderBy('date', 'desc'));

        if (lastDoc) {
            constraints.push(startAfter(lastDoc));
        }

        // Fetch one more item than the page size to check if there's a next page.
        constraints.push(limit(pageSize + 1)); 

        const q = query(collection(db, collectionName), ...constraints);

      unsubscribeRef.current = onSnapshot(q, (snapshot) => {
          const newDocs = snapshot.docs;
          const newItems = newDocs.map(doc => ({ ...doc.data(), id: doc.id } as AllItems));
          
          const hasMoreItems = newItems.length > pageSize;
          if(hasMoreItems) {
              newItems.pop(); // Remove the extra item used for the check
          }
          
          setHasMore(itemTypeFilter, hasMoreItems);
          setLastDoc(itemTypeFilter, newDocs[newDocs.length - 1] ?? null);

          // Append new items if it's a "load more" action, otherwise set them.
          if (lastDoc) {
              setItems(itemTypeFilter, (prev) => [...prev, ...newItems]);
          } else {
              setItems(itemTypeFilter, newItems);
          }

          setIsLoading(itemTypeFilter, false);
      }, (err) => {
          console.error(`[useObservations] Firestore snapshot error for ${collectionName}:`, err);
          setError(itemTypeFilter, `Failed to load ${collectionName}.`);
          setIsLoading(itemTypeFilter, false);
      });
    } catch (err) {
      console.error(`[useObservations] Error creating query for ${collectionName}:`, err);
      setError(itemTypeFilter, `Error setting up data query.`);
      setIsLoading(itemTypeFilter, false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  // We use JSON.stringify on filters to ensure the effect reruns on value change, not object reference change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, itemTypeFilter, user, JSON.stringify(filters), pageSize, lastDoc]);
}
