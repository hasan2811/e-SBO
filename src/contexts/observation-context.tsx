
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
  Unsubscribe,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { AllItems, Scope, Observation, UserProfile, Inspection } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { usePathname } from 'next/navigation';
import { toggleLike, incrementViewCount } from '@/lib/actions/interaction-actions';
import { updateObservationStatus, retryAiAnalysis, shareObservationToPublic, deleteItem, deleteMultipleItems } from '@/lib/actions/item-actions';

const PAGE_SIZE = 10;

interface ObservationContextType {
  items: AllItems[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  fetchItems: (reset?: boolean) => void;
  updateItem: (updatedItem: AllItems) => void;
  removeItem: (itemId: string) => void;
  removeMultipleItems: (itemsToRemove: AllItems[]) => Promise<void>;
  handleLikeToggle: (observationId: string) => Promise<void>;
  handleViewCount: (observationId: string) => void;
  shareToPublic: (observation: Observation) => Promise<void>;
  retryAnalysis: (item: Observation | Inspection) => Promise<void>;
  updateStatus: (observation: Observation, actionData: any) => Promise<void>;
  viewType: 'observations' | 'inspections' | 'ptws';
  setViewType: (viewType: 'observations' | 'inspections' | 'ptws') => void;
  getObservationById: (id: string) => Observation | undefined;
}

export const ObservationContext = React.createContext<ObservationContextType | undefined>(undefined);

const viewTypeInfo = {
    observations: { collection: 'observations' },
    inspections: { collection: 'inspections' },
    ptws: { collection: 'ptws' },
};

export function ObservationProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();

  const [items, setItems] = React.useState<AllItems[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasMore, setHasMore] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastVisible, setLastVisible] = React.useState<QueryDocumentSnapshot | null>(null);
  const [viewType, setViewType] = React.useState<'observations' | 'inspections' | 'ptws'>('observations');
  
  const mode: Scope = pathname.startsWith('/proyek') ? 'project' : pathname.startsWith('/public') ? 'public' : 'private';
  const projectId = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/)?.[1] || null;

  const fetchItems = React.useCallback(async (reset: boolean = false) => {
    if ((mode === 'private' || mode === 'project') && !user) return;

    setIsLoading(true);
    setError(null);
    const lastDoc = reset ? null : lastVisible;
    const collectionName = viewTypeInfo[viewType].collection;
    
    let baseQuery = query(collection(db, collectionName));

    // Apply filters based on mode
    if (mode === 'public') {
      baseQuery = query(baseQuery, where('scope', '==', 'public'));
    } else if (mode === 'project' && projectId) {
      baseQuery = query(baseQuery, where('projectId', '==', projectId));
    } else if (mode === 'private' && user) {
      baseQuery = query(baseQuery, where('scope', '==', 'private'), where('userId', '==', user.uid));
    } else {
      setItems([]); setIsLoading(false); return;
    }
    
    // This is the primary query that now relies on the composite indexes.
    const finalQuery = query(
      baseQuery, 
      orderBy('date', 'desc'), 
      lastDoc ? startAfter(lastDoc) : limit(PAGE_SIZE), 
      limit(PAGE_SIZE)
    );

    try {
      const docSnap = await getDocs(finalQuery);
      const newItems: AllItems[] = docSnap.docs.map(d => ({ ...d.data(), id: d.id, itemType: viewType.slice(0, -1) as any }));
      
      setHasMore(newItems.length === PAGE_SIZE);
      setLastVisible(docSnap.docs[docSnap.docs.length - 1] || null);
      setItems(prev => reset ? newItems : [...prev, ...newItems]);
    } catch (e: any) {
        if (e.code === 'failed-precondition') {
            setError("Terjadi kesalahan konfigurasi database. Pastikan semua indeks yang diperlukan telah dibuat dengan benar di Firebase Console.");
            console.error("Firestore index missing error. Please verify the required composite indexes.", e);
        } else {
            console.error("Failed to fetch items:", e);
            setError("Gagal memuat data. Silakan periksa koneksi Anda.");
        }
        setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [mode, projectId, user, viewType, lastVisible]);


  const resetAndFetch = React.useCallback(() => {
    setItems([]);
    setLastVisible(null);
    fetchItems(true);
  }, [fetchItems]);

  React.useEffect(() => {
    resetAndFetch();
  }, [mode, projectId, viewType, user]);


  const updateItem = React.useCallback((updatedItem: AllItems) => {
    setItems(prevItems => prevItems.map(item => item.id === updatedItem.id ? updatedItem : item));
  }, []);
  
  const removeItem = React.useCallback((itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  }, []);
  
  const removeMultipleItems = React.useCallback(async (itemsToRemove: AllItems[]) => {
      await deleteMultipleItems(itemsToRemove);
      const idsToRemove = new Set(itemsToRemove.map(i => i.id));
      setItems(prev => prev.filter(item => !idsToRemove.has(item.id)));
  }, []);

  const handleLikeToggle = React.useCallback(async (observationId: string) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'You must be logged in to like.' });
        return;
    }
    
    // Optimistic UI update
    setItems(prevItems => {
        const itemIndex = prevItems.findIndex(item => item.id === observationId);
        if (itemIndex === -1 || prevItems[itemIndex].itemType !== 'observation') {
            return prevItems;
        }

        const originalObservation = prevItems[itemIndex] as Observation;
        const originalLikes = Array.isArray(originalObservation.likes) ? originalObservation.likes : [];
        const hasLiked = originalLikes.includes(user.uid);
        
        const newLikes = hasLiked
            ? originalLikes.filter(uid => uid !== user.uid)
            : [...originalLikes, user.uid];

        const updatedObservation: Observation = {
            ...originalObservation,
            likes: newLikes,
            likeCount: newLikes.length,
        };
        
        const newItems = [...prevItems];
        newItems[itemIndex] = updatedObservation;
        return newItems;
    });

    try {
        await toggleLike({ docId: observationId, userId: user.uid, collectionName: 'observations' });
    } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Gagal Memproses Suka',
          description: 'Gagal menyinkronkan dengan server. Aksi Anda mungkin tidak tersimpan.',
        });
        console.error("Failed to process like on server:", error);
    }
  }, [user, toast]);
  
  const handleViewCount = React.useCallback((observationId: string) => {
      setItems(prevItems => {
        const itemIndex = prevItems.findIndex(item => item.id === observationId);
        if (itemIndex === -1 || prevItems[itemIndex].itemType !== 'observation') return prevItems;
        
        const currentObservation = prevItems[itemIndex] as Observation;
        const updatedObservation: Observation = {
            ...currentObservation,
            viewCount: (typeof currentObservation.viewCount === 'number' ? currentObservation.viewCount : 0) + 1,
        };
        
        const newItems = [...prevItems];
        newItems[itemIndex] = updatedObservation;
        return newItems;
    });
    incrementViewCount({ docId: observationId, collectionName: 'observations' });
  }, []);
  
  const shareToPublic = React.useCallback(async (observation: Observation) => {
      if (!userProfile) {
          toast({ variant: 'destructive', title: 'User profile not loaded.' });
          return;
      }
      const updatedItem = await shareObservationToPublic(observation, userProfile);
      if (updatedItem) updateItem(updatedItem);
  }, [userProfile, toast, updateItem]);
  
  const retryAnalysis = React.useCallback(async (item: Observation | Inspection) => {
      const updatedItem = await retryAiAnalysis(item);
      if (updatedItem) {
        if (item.itemType === 'observation') {
          updateItem(updatedItem as Observation);
        } else {
          updateItem(updatedItem as Inspection);
        }
      }
  }, [updateItem]);
  
  const updateStatus = React.useCallback(async (observation: Observation, actionData: any) => {
    if (!user || !userProfile) return;
    const updatedItem = await updateObservationStatus({ observationId: observation.id, actionData, user: userProfile });
    if(updatedItem) updateItem(updatedItem);
  }, [user, userProfile, updateItem]);

  const getObservationById = React.useCallback((id: string): Observation | undefined => {
    return items.find(item => item.id === id && item.itemType === 'observation') as Observation | undefined;
  }, [items]);

  const value = React.useMemo(() => ({
    items, isLoading, hasMore, error,
    fetchItems: resetAndFetch,
    updateItem, removeItem, removeMultipleItems,
    handleLikeToggle, handleViewCount, shareToPublic, retryAnalysis, updateStatus,
    viewType, setViewType, getObservationById
  }), [
      items, isLoading, hasMore, error,
      resetAndFetch, updateItem, removeItem, removeMultipleItems,
      handleLikeToggle, handleViewCount, shareToPublic, retryAnalysis, updateStatus,
      viewType, getObservationById
  ]);

  return <ObservationContext.Provider value={value}>{children}</ObservationContext.Provider>;
}
