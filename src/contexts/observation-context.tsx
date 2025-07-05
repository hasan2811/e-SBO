
'use client';

import * as React from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { AllItems, Scope, Observation, Inspection, Ptw } from '@/lib/types';
import { usePathname } from 'next/navigation';
import { toggleLike, incrementViewCount } from '@/lib/actions/interaction-actions';

const PAGE_SIZE = 10;

interface ObservationContextType {
  items: AllItems[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  fetchMoreItems: () => void;
  updateItem: (item: AllItems) => void;
  removeItem: (itemId: string) => void;
  handleLikeToggle: (observationId: string) => Promise<void>;
  handleViewCount: (observationId: string) => void;
  viewType: 'observations' | 'inspections' | 'ptws';
  setViewType: (viewType: 'observations' | 'inspections' | 'ptws') => void;
  getObservationById: (id: string) => Observation | undefined;
  getInspectionById: (id: string) => Inspection | undefined;
  getPtwById: (id: string) => Ptw | undefined;
}

export const ObservationContext = React.createContext<ObservationContextType | undefined>(undefined);

const viewTypeInfo = {
    observations: { collection: 'observations' },
    inspections: { collection: 'inspections' },
    ptws: { collection: 'ptws' },
};

export function ObservationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();

  const [items, setItems] = React.useState<AllItems[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasMore, setHasMore] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastVisible, setLastVisible] = React.useState<QueryDocumentSnapshot | null>(null);
  const [viewType, setViewType] = React.useState<'observations' | 'inspections' | 'ptws'>('observations');
  
  const mode: Scope = pathname.startsWith('/proyek') ? 'project' : pathname.startsWith('/public') ? 'public' : 'private';
  const projectId = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/)?.[1] || null;

  const updateItem = React.useCallback((updatedItem: AllItems) => {
    setItems(prevItems => prevItems.map(item => item.id === updatedItem.id ? updatedItem : item));
  }, []);

  const removeItem = React.useCallback((itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  }, []);


  React.useEffect(() => {
    if ((mode === 'private' || mode === 'project') && !user) {
        setItems([]);
        setIsLoading(false);
        return;
    }
    
    setIsLoading(true);
    const collectionName = viewTypeInfo[viewType].collection;
    let baseQuery = query(collection(db, collectionName));

    if (mode === 'public') {
      baseQuery = query(baseQuery, where('scope', '==', 'public'));
    } else if (mode === 'project' && projectId) {
      baseQuery = query(baseQuery, where('projectId', '==', projectId));
    } else if (mode === 'private' && user) {
      baseQuery = query(baseQuery, where('scope', '==', 'private'), where('userId', '==', user.uid));
    } else {
      setItems([]); 
      setIsLoading(false); 
      return;
    }
    
    const finalQuery = query(
      baseQuery, 
      orderBy('date', 'desc'), 
      limit(PAGE_SIZE)
    );
    
    const unsubscribe = onSnapshot(finalQuery, (snapshot) => {
        const newItems: AllItems[] = snapshot.docs.map(d => ({ ...d.data(), id: d.id, itemType: viewType.slice(0, -1) as any }));
        setItems(newItems);
        setHasMore(newItems.length === PAGE_SIZE);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
        setError(null);
        setIsLoading(false);
    }, (e) => {
        if (e.code === 'failed-precondition') {
            setError("Database query failed. Please ensure all required indexes are built in the Firebase Console.");
            console.error("Firestore index missing error. Please verify the required composite indexes.", e);
        } else {
            console.error("Failed to fetch items:", e);
            setError("Failed to load data. Please check your connection.");
        }
        setItems([]);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [mode, projectId, viewType, user]);


  const fetchMoreItems = React.useCallback(async () => {
    if (!hasMore || isLoading || !lastVisible) return;
    if ((mode === 'private' || mode === 'project') && !user) return;
    
    setIsLoading(true);
    const collectionName = viewTypeInfo[viewType].collection;
    
    let baseQuery = query(collection(db, collectionName));
    if (mode === 'public') baseQuery = query(baseQuery, where('scope', '==', 'public'));
    else if (mode === 'project' && projectId) baseQuery = query(baseQuery, where('projectId', '==', projectId));
    else if (mode === 'private' && user) baseQuery = query(baseQuery, where('scope', '==', 'private'), where('userId', '==', user.uid));
    else return;

    const finalQuery = query(
      baseQuery, 
      orderBy('date', 'desc'), 
      startAfter(lastVisible),
      limit(PAGE_SIZE)
    );

    try {
      const docSnap = await getDocs(finalQuery);
      const newItems: AllItems[] = docSnap.docs.map(d => ({ ...d.data(), id: d.id, itemType: viewType.slice(0, -1) as any }));
      setHasMore(newItems.length === PAGE_SIZE);
      setLastVisible(docSnap.docs[docSnap.docs.length - 1] || null);
      setItems(prev => [...prev, ...newItems]);
    } catch (e: any) {
       console.error("Failed to fetch more items:", e);
       setError("Failed to load more data.");
    } finally {
        setIsLoading(false);
    }
  }, [hasMore, isLoading, lastVisible, mode, user, projectId, viewType]);

  const handleLikeToggle = React.useCallback(async (observationId: string) => {
    if (!user) return;
    try {
        const updatedObservation = await toggleLike({ docId: observationId, userId: user.uid, collectionName: 'observations' });
        updateItem(updatedObservation);
    } catch (error) {
        console.error("Failed to sync like with server:", error);
    }
  }, [user, updateItem]);
  
  const handleViewCount = React.useCallback((observationId: string) => {
      incrementViewCount({ docId: observationId, collectionName: 'observations' }).catch(console.error);
  }, []);
  
  const getObservationById = React.useCallback((id: string): Observation | undefined => {
    return items.find(item => item.id === id && item.itemType === 'observation') as Observation | undefined;
  }, [items]);
  
  const getInspectionById = React.useCallback((id: string): Inspection | undefined => {
    return items.find(item => item.id === id && item.itemType === 'inspection') as Inspection | undefined;
  }, [items]);

  const getPtwById = React.useCallback((id: string): Ptw | undefined => {
    return items.find(item => item.id === id && item.itemType === 'ptw') as Ptw | undefined;
  }, [items]);

  const value = React.useMemo(() => ({
    items, isLoading, hasMore, error,
    fetchMoreItems, updateItem, removeItem,
    handleLikeToggle, handleViewCount,
    viewType, setViewType, getObservationById, getInspectionById, getPtwById
  }), [
      items, isLoading, hasMore, error,
      fetchMoreItems, updateItem, removeItem,
      handleLikeToggle, handleViewCount,
      viewType, getObservationById, getInspectionById, getPtwById
  ]);

  return <ObservationContext.Provider value={value}>{children}</ObservationContext.Provider>;
}
