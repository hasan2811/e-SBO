
'use client';

import * as React from 'react';
import { useContext }from 'react';
import { collection, query, orderBy, where, getDocs, limit, startAfter, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AllItems } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { ObservationContext } from '@/contexts/observation-context';

const ITEMS_PER_PAGE = 10; // Smaller page size for faster loads

export function useObservations(projectId: string | null, itemTypeFilter: AllItems['itemType']) {
  const context = useContext(ObservationContext);
  const { user } = useAuth();
  
  if (context === undefined) {
    throw new Error('useObservations must be used within an ObservationProvider');
  }

  const { items, setItems, isLoading, setIsLoading, setError } = context;

  const [lastVisible, setLastVisible] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = React.useState(true);
  const [isFetchingMore, setIsFetchingMore] = React.useState(false);

  // Use a ref to prevent re-fetching on every render if projectId/filter haven't changed
  const lastFetchedRef = React.useRef<{ projectId: string | null; itemTypeFilter: string | null }>({ projectId: null, itemTypeFilter: null });

  React.useEffect(() => {
    // Initial fetch logic. It runs only when the component mounts or critical dependencies change.
    const initialFetch = async () => {
        if (!projectId || !user || !itemTypeFilter) {
            setIsLoading(false);
            return;
        }

        // Only re-fetch if project or filter has truly changed from the last fetch for this instance.
        if (lastFetchedRef.current.projectId === projectId && lastFetchedRef.current.itemTypeFilter === itemTypeFilter) {
            setIsLoading(false); // Already loaded this data
            return;
        }

        setIsLoading(true);
        setError(null);
        // Do NOT clear items here to prevent a jarring visual flash during project switching.
        // The new items will seamlessly replace the old ones.

        try {
            const collectionName = `${itemTypeFilter}s`;
            const q = query(
                collection(db, collectionName),
                where('projectId', '==', projectId),
                orderBy('date', 'desc'),
                limit(ITEMS_PER_PAGE)
            );

            const documentSnapshots = await getDocs(q);
            const newItems = documentSnapshots.docs.map(doc => ({ ...doc.data(), id: doc.id })) as AllItems[];

            setItems(newItems);
            setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null);
            setHasMore(documentSnapshots.docs.length === ITEMS_PER_PAGE);
            lastFetchedRef.current = { projectId, itemTypeFilter }; // Mark as fetched
        } catch (err) {
            console.error(err);
            setError(`Failed to load ${itemTypeFilter}s.`);
            setItems([]); // On error, clear items to avoid showing stale data.
        } finally {
            setIsLoading(false);
        }
    };
    
    initialFetch();

  }, [projectId, user, itemTypeFilter, setItems, setIsLoading, setError]);

  const loadMore = React.useCallback(async () => {
    if (isFetchingMore || !hasMore || !lastVisible || !projectId || !itemTypeFilter) {
        return;
    }
    
    setIsFetchingMore(true);
    try {
        const collectionName = `${itemTypeFilter}s`;
        const q = query(
            collection(db, collectionName),
            where('projectId', '==', projectId),
            orderBy('date', 'desc'),
            startAfter(lastVisible),
            limit(ITEMS_PER_PAGE)
        );

        const documentSnapshots = await getDocs(q);
        const newItems = documentSnapshots.docs.map(doc => ({ ...doc.data(), id: doc.id })) as AllItems[];

        setItems(prevItems => [...prevItems, ...newItems]);
        setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null);
        setHasMore(documentSnapshots.docs.length === ITEMS_PER_PAGE);
    } catch (err) {
        console.error(err);
        setError(`Failed to load more ${itemTypeFilter}s.`);
    } finally {
        setIsFetchingMore(false);
    }
  }, [isFetchingMore, hasMore, lastVisible, projectId, itemTypeFilter, setItems, setError]);

  return { ...context, loadMore, hasMore, isFetchingMore };
}
