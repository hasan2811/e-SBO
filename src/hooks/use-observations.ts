
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
    if (unsubscribeRef.current) {
        unsubscribeRef.current();
    }

    if (!projectId || !user || !itemTypeFilter) {
      setIsLoading(false);
      setItems([]);
      return;
    }

    setIsLoading(true);
    setItems([]); // Always start with a clean slate when dependencies change
    setError(null);
    
    const collectionName = `${itemTypeFilter}s`;
    const q = query(
        collection(db, collectionName),
        where('projectId', '==', projectId),
        orderBy('date', 'desc'),
        limit(ITEMS_PER_PAGE)
    );

    // This flag helps distinguish the very first data snapshot from subsequent real-time updates.
    let isInitialLoad = true;

    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
        if (isInitialLoad) {
            // For the very first load, just set the items directly.
            const initialItems: AllItems[] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AllItems));
            setItems(initialItems);
            isInitialLoad = false;
        } else {
            // For all subsequent real-time updates, process changes granularly.
            snapshot.docChanges().forEach((change) => {
                const changedItem = { ...change.doc.data(), id: change.doc.id } as AllItems;

                if (change.type === "added") {
                    // Handles new items from others AND confirms our optimistic items.
                    setItems(prevItems => {
                        // Remove the corresponding optimistic item if it exists.
                        const itemsWithoutOptimistic = prevItems.filter(item => 
                            !(item.optimisticState === 'uploading' && item.referenceId === changedItem.referenceId)
                        );
                        // Add the new server-confirmed item, ensuring no duplicates.
                        const finalItems = [changedItem, ...itemsWithoutOptimistic.filter(i => i.id !== changedItem.id)];
                        // Re-sort to maintain chronological order.
                        finalItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        return finalItems;
                    });
                }
                if (change.type === "modified") {
                    // An item was updated (e.g., status change, AI analysis completed).
                    updateItem(changedItem);
                }
                if (change.type === "removed") {
                    // An item was deleted.
                    removeItem(changedItem.id);
                }
            });
        }
        
        setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);
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
  }, [projectId, user, itemTypeFilter, setItems, setIsLoading, setError, updateItem, removeItem]);

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
