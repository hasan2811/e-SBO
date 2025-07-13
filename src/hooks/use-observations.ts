
'use client';

import * as React from 'react';
import { collection, query, orderBy, where, getDocs, type Unsubscribe, limit, startAfter, QueryConstraint, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
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
    pageSize: number
) {
  const context = React.useContext(ObservationContext);
  const { user } = useAuth();
  
  if (context === undefined) {
    throw new Error('useObservations must be used within an ObservationProvider');
  }

  const { items, setItems, isLoading, setIsLoading, setError, setHasMore, lastDoc, setLastDoc } = context;

  const fetchItems = React.useCallback(async (startAfterDoc: QueryDocumentSnapshot<DocumentData> | null = null) => {
    if (!user || !projectId) {
      setItems(itemTypeFilter, []);
      setIsLoading(itemTypeFilter, false);
      return;
    }

    if (!isLoading) {
      setIsLoading(itemTypeFilter, true);
    }
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

        if (startAfterDoc) {
            constraints.push(startAfter(startAfterDoc));
        }
        
        constraints.push(limit(pageSize + 1)); 

        const q = query(collection(db, collectionName), ...constraints);
        const snapshot = await getDocs(q);
        
        const newDocs = snapshot.docs;
        const newItems = newDocs.map(doc => ({ ...doc.data(), id: doc.id } as AllItems));
        
        const hasMoreItems = newItems.length > pageSize;
        if(hasMoreItems) {
            newItems.pop(); 
        }
        
        const lastVisible = newDocs.length > 0 ? newDocs[newDocs.length - 1] : null;

        setHasMore(itemTypeFilter, hasMoreItems);
        setLastDoc(itemTypeFilter, lastVisible);

        if (startAfterDoc) {
            setItems(itemTypeFilter, (prev) => [...prev, ...newItems]);
        } else {
            setItems(itemTypeFilter, newItems);
        }

    } catch (err) {
      console.error(`[useObservations] Firestore getDocs error for ${collectionName}:`, err);
      setError(itemTypeFilter, `Failed to load ${collectionName}.`);
    } finally {
        setIsLoading(itemTypeFilter, false);
    }
  // We use JSON.stringify on filters to ensure the effect reruns on value change, not object reference change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, itemTypeFilter, user, JSON.stringify(filters), pageSize, setIsLoading, setError, setItems, setHasMore, setLastDoc]);
  
  // Effect for initial fetch and filter changes
  React.useEffect(() => {
      // Reset and fetch from the beginning when filters change
      setLastDoc(itemTypeFilter, null);
      setItems(itemTypeFilter, []);
      fetchItems(null);
  // We want this to run ONLY when filters change, not on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters), itemTypeFilter, projectId]);


  const loadMore = React.useCallback(() => {
    if (lastDoc[itemTypeFilter]) {
        fetchItems(lastDoc[itemTypeFilter]);
    }
  }, [fetchItems, lastDoc, itemTypeFilter]);

  return { loadMore, refetch: () => fetchItems(null) };
}
