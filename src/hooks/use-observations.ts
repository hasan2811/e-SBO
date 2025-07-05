
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
  
  // Use a ref to track the current context (project + filter) to prevent unnecessary full reloads.
  const contextKeyRef = React.useRef<string | null>(null);


  React.useEffect(() => {
    if (unsubscribeRef.current) {
        unsubscribeRef.current();
    }

    const newContextKey = `${projectId}-${itemTypeFilter}`;
    const contextHasChanged = contextKeyRef.current !== newContextKey;

    if (!projectId || !user) {
      if (items.length > 0) setItems([]);
      setIsLoading(false);
      return;
    }
    
    // Only perform a full, destructive reset if the user has navigated to a new context.
    if (contextHasChanged) {
        contextKeyRef.current = newContextKey;
        setIsLoading(true);
        setItems([]);
        setError(null);
    }
    
    const collectionName = `${itemTypeFilter}s`;
    
    const q = query(
        collection(db, collectionName),
        where('projectId', '==', projectId),
        orderBy('date', 'desc'),
        limit(ITEMS_PER_PAGE)
    );

    let isInitialLoadForQuery = true;

    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
        // On first load of a *new context*, set the items directly.
        if (contextHasChanged && isInitialLoadForQuery) {
            const initialItems: AllItems[] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AllItems));
            setItems(initialItems);
            isInitialLoadForQuery = false;
        } else {
             // For subsequent real-time updates within the same context, process changes granularly.
            snapshot.docChanges().forEach((change) => {
                const changedItem = { ...change.doc.data(), id: change.doc.id } as AllItems;

                if (change.type === "added") {
                    setItems(prevItems => {
                        const itemsWithoutOptimistic = prevItems.filter(item => 
                            !(item.optimisticState === 'uploading' && item.referenceId === changedItem.referenceId)
                        );
                        if (itemsWithoutOptimistic.some(i => i.id === changedItem.id)) {
                          return itemsWithoutOptimistic; // Item already exists, prevent duplication.
                        }
                        const finalItems = [changedItem, ...itemsWithoutOptimistic];
                        finalItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        return finalItems;
                    });
                }
                if (change.type === "modified") {
                    updateItem(changedItem);
                }
                if (change.type === "removed") {
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
  // Using user.uid is critical to prevent re-renders when the user object reference changes.
  // We disable exhaustive-deps because the context setters (setItems, etc.) are stable and don't need to be dependencies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, itemTypeFilter, user?.uid]);

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
