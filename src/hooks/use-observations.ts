
'use client';

import * as React from 'react';
import { useContext }from 'react';
import { collection, query, orderBy, where, getDocs, limit, startAfter, onSnapshot, type QueryDocumentSnapshot, type DocumentData, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AllItems } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { ObservationContext } from '@/contexts/observation-context';

const ITEMS_PER_PAGE = 10;

export function useObservations(projectId: string | null, itemTypeFilter: AllItems['itemType']) {
  const context = useContext(ObservationContext);
  const { user } = useAuth();
  
  if (context === undefined) {
    throw new Error('useObservations must be used within an ObservationProvider');
  }

  const { items, setItems, isLoading, setIsLoading, setError, updateItem, removeItem } = context;

  const [lastVisible, setLastVisible] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = React.useState(true);
  const [isFetchingMore, setIsFetchingMore] = React.useState(false);
  const unsubscribeRef = React.useRef<Unsubscribe | null>(null);

  React.useEffect(() => {
    // Clean up the previous listener when the component unmounts or dependencies change.
    if (unsubscribeRef.current) {
        unsubscribeRef.current();
    }

    if (!projectId || !user || !itemTypeFilter) {
      setIsLoading(false);
      setItems([]); // Clear items if there's no project to view
      return;
    }

    setIsLoading(true);
    setError(null);
    
    const collectionName = `${itemTypeFilter}s`;
    const q = query(
        collection(db, collectionName),
        where('projectId', '==', projectId),
        orderBy('date', 'desc'),
        limit(ITEMS_PER_PAGE)
    );

    // Establish a real-time listener for the first page of data.
    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
        const newItems: AllItems[] = [];
        snapshot.forEach(doc => {
            newItems.push({ ...doc.data(), id: doc.id } as AllItems);
        });
        
        setItems(newItems);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);
        setIsLoading(false);
    }, (err) => {
        console.error(err);
        setError(`Failed to load ${itemTypeFilter}s.`);
        setIsLoading(false);
    });

    // Cleanup function to detach the listener.
    return () => {
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }
    };
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
