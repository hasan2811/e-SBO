
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
import type { AllItems, Scope, Observation } from '@/lib/types';
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
  warning: string | null;
  fetchItems: (reset?: boolean) => void;
  updateItem: (updatedItem: AllItems) => void;
  removeItem: (itemId: string) => void;
  removeMultipleItems: (itemsToRemove: AllItems[]) => Promise<void>;
  handleLikeToggle: (observation: Observation) => Promise<void>;
  handleViewCount: (observation: Observation) => void;
  shareToPublic: (observation: Observation) => Promise<void>;
  retryAnalysis: (item: Observation) => Promise<void>;
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
  const { user } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();

  const [items, setItems] = React.useState<AllItems[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasMore, setHasMore] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [warning, setWarning] = React.useState<string | null>(null);
  const [lastVisible, setLastVisible] = React.useState<QueryDocumentSnapshot | null>(null);
  const [viewType, setViewType] = React.useState<'observations' | 'inspections' | 'ptws'>('observations');
  
  const mode: Scope = pathname.startsWith('/proyek') ? 'project' : pathname.startsWith('/public') ? 'public' : 'private';
  const projectId = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/)?.[1] || null;

  const fetchItems = React.useCallback(async (reset: boolean = false) => {
    if (!user && (mode === 'private' || mode === 'project')) return;

    setIsLoading(true);
    setError(null);
    if (reset) {
        setWarning(null);
    }
    const lastDoc = reset ? null : lastVisible;

    const collectionName = viewTypeInfo[viewType].collection;
    let baseQuery = query(collection(db, collectionName), limit(PAGE_SIZE));

    if (mode === 'public') baseQuery = query(baseQuery, where('scope', '==', 'public'));
    else if (mode === 'project' && projectId) baseQuery = query(baseQuery, where('scope', '==', 'project'), where('projectId', '==', projectId));
    else if (mode === 'private' && user) baseQuery = query(baseQuery, where('scope', '==', 'private'), where('userId', '==', user.uid));
    else {
        setItems([]); setIsLoading(false); return;
    }

    let q = query(baseQuery, orderBy('date', 'desc'));
    if (lastDoc && !reset) {
        q = query(q, startAfter(lastDoc));
    }

    try {
        const docSnap = await getDocs(q);
        const newItems: AllItems[] = docSnap.docs.map(d => ({ ...d.data(), id: d.id, itemType: viewType.slice(0, -1) as any }));
        
        setHasMore(newItems.length === PAGE_SIZE);
        setLastVisible(docSnap.docs[docSnap.docs.length - 1] || null);
        setItems(prev => reset ? newItems : [...prev, ...newItems]);
        if (reset) setWarning(null);
    } catch (e) {
        console.error("Primary query failed (likely missing index), attempting fallback:", e);

        // Fallback strategy
        setWarning("Data mungkin tidak terurut dengan benar. Mohon hubungi administrator untuk memeriksa konfigurasi database.");
        
        if (!reset) {
            setHasMore(false);
            setIsLoading(false);
            return;
        }

        try {
            const fallbackSnap = await getDocs(baseQuery);
            let newItems: AllItems[] = fallbackSnap.docs.map(d => ({ ...d.data(), id: d.id, itemType: viewType.slice(0, -1) as any }));

            newItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setHasMore(false);
            setLastVisible(null);
            setItems(newItems);
        } catch (fallbackError) {
            console.error("Fallback query also failed:", fallbackError);
            setError("Gagal memuat data. Silakan periksa koneksi Anda dan coba lagi.");
            setItems([]);
        }
    } finally {
        setIsLoading(false);
    }
  }, [mode, projectId, user, viewType, lastVisible]);

  React.useEffect(() => {
    fetchItems(true);
  }, [mode, projectId, viewType, user]);

  const updateItem = (updatedItem: AllItems) => {
    setItems(prevItems => prevItems.map(item => item.id === updatedItem.id ? updatedItem : item));
  };
  
  const removeItem = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };
  
  const removeMultipleItems = async (itemsToRemove: AllItems[]) => {
      await deleteMultipleItems(itemsToRemove);
      const idsToRemove = new Set(itemsToRemove.map(i => i.id));
      setItems(prev => prev.filter(item => !idsToRemove.has(item.id)));
  };

  const handleLikeToggle = async (observation: Observation) => {
      if (!user) { toast({ variant: 'destructive', title: 'You must be logged in to like.' }); return; }
      
      const originalLikes = observation.likes || [];
      const hasLiked = originalLikes.includes(user.uid);
      const newLikes = hasLiked ? originalLikes.filter(uid => uid !== user.uid) : [...originalLikes, user.uid];

      updateItem({ ...observation, likes: newLikes, likeCount: newLikes.length });

      try {
          await toggleLike({ docId: observation.id, userId: user.uid, collectionName: 'observations' });
      } catch (error) {
          toast({ variant: 'destructive', title: 'Failed to process like.' });
          updateItem(observation);
      }
  };
  
  const handleViewCount = (observation: Observation) => {
      updateItem({ ...observation, viewCount: (observation.viewCount || 0) + 1 });
      incrementViewCount({ docId: observation.id, collectionName: 'observations' });
  };
  
  const shareToPublic = async (observation: Observation) => {
      const updatedItem = await shareObservationToPublic(observation);
      if (updatedItem) updateItem(updatedItem);
  };
  
  const retryAnalysis = async (item: Observation) => {
      const updatedItem = await retryAiAnalysis(item);
      if (updatedItem) updateItem(updatedItem as Observation);
  };
  
  const updateStatus = async (observation: Observation, actionData: any) => {
    if (!user) return;
    const userProfile = { uid: user.uid, displayName: user.displayName || 'User', position: '' };
    const docSnap = await getDoc(doc(db, 'users', user.uid));
    if (docSnap.exists()) {
        userProfile.displayName = docSnap.data().displayName;
        userProfile.position = docSnap.data().position;
    }
    const updatedItem = await updateObservationStatus({ observationId: observation.id, actionData, user: userProfile });
    if(updatedItem) updateItem(updatedItem);
  };

  const getObservationById = (id: string): Observation | undefined => {
    return items.find(item => item.id === id && item.itemType === 'observation') as Observation | undefined;
  };

  const value = {
    items, isLoading, hasMore, error, warning,
    fetchItems, updateItem, removeItem, removeMultipleItems,
    handleLikeToggle, handleViewCount, shareToPublic, retryAnalysis, updateStatus,
    viewType, setViewType, getObservationById
  };

  return <ObservationContext.Provider value={value}>{children}</ObservationContext.Provider>;
}
