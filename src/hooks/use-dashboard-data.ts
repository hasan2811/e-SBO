'use client';

import * as React from 'react';
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AllItems } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

export function useDashboardData(projectId: string | null) {
  const { user } = useAuth();
  const [items, setItems] = React.useState<AllItems[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user || !projectId) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    const itemTypes: AllItems['itemType'][] = ['observation', 'inspection', 'ptw'];
    const unsubscribes: Unsubscribe[] = [];
    const itemStore: { [key in AllItems['itemType']]: AllItems[] } = {
        observation: [],
        inspection: [],
        ptw: []
    };
    
    let collectionsLoaded = 0;

    itemTypes.forEach(itemType => {
      const collectionName = `${itemType}s`;
      const q = query(collection(db, collectionName), where('projectId', '==', projectId));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        itemStore[itemType] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AllItems));
        
        const allFetchedItems = Object.values(itemStore).flat();
        allFetchedItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setItems(allFetchedItems);
        
        // This part ensures loading is only false after the first fetch of all collections
        if (collectionsLoaded < itemTypes.length) {
            collectionsLoaded++;
            if (collectionsLoaded === itemTypes.length) {
                setIsLoading(false);
            }
        }

      }, (err) => {
        console.error(`[useDashboardData] Snapshot error for ${collectionName}:`, err);
        setError(`Failed to load data for ${collectionName}.`);
        setIsLoading(false);
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [projectId, user]);

  return { items, isLoading, error };
}
