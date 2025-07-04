
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
import type { AllItems, Scope, Observation, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { usePathname } from 'next/navigation';
import { toggleLike, incrementViewCount } from '@/lib/actions/interaction-actions';
import { updateObservationStatus, retryAiAnalysis, shareObservationToPublic, deleteItem, deleteMultipleItems } from '@/lib/actions/item-actions';

const PAGE_SIZE = 10;
const NON_PAGINATED_LIMIT = 500; // A reasonable limit for non-paginated queries

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
  const { user, userProfile } = useAuth();
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
    if ((mode === 'private' || mode === 'project') && !user) return;

    setIsLoading(true);
    setError(null);
    setWarning(null);
    const lastDoc = reset ? null : lastVisible;

    const collectionName = viewTypeInfo[viewType].collection;
    
    const runQuery = async (q: any, isPaginated: boolean) => {
        const docSnap = await getDocs(q);
        let newItems: AllItems[] = docSnap.docs.map(d => ({ ...d.data(), id: d.id, itemType: viewType.slice(0, -1) as any }));
        
        if (!isPaginated) {
            newItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        setHasMore(isPaginated ? newItems.length === PAGE_SIZE : false);
        setLastVisible(isPaginated ? docSnap.docs[docSnap.docs.length - 1] || null : null);
        setItems(prev => reset ? newItems : [...prev, ...newItems]);
    }
    
    try {
      const isPaginated = mode === 'public';
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

      // Main query with server-side ordering (for public feed or properly indexed feeds)
      const mainQuery = isPaginated 
        ? query(baseQuery, orderBy('date', 'desc'), limit(PAGE_SIZE), lastDoc ? startAfter(lastDoc) : limit(PAGE_SIZE))
        : query(baseQuery, orderBy('date', 'desc'), limit(NON_PAGINATED_LIMIT));

      // Fallback query without server-side ordering (to prevent index errors)
      const fallbackQuery = isPaginated 
        ? query(baseQuery, limit(PAGE_SIZE), lastDoc ? startAfter(lastDoc) : limit(PAGE_SIZE))
        : query(baseQuery, limit(NON_PAGINATED_LIMIT));

      try {
        await runQuery(mainQuery, isPaginated);
      } catch (e: any) {
        if (e.code === 'failed-precondition') {
          setWarning('Data mungkin tidak terurut dengan benar. Hubungi administrator untuk mengkonfigurasi indeks database yang diperlukan untuk pengurutan yang optimal.');
          await runQuery(fallbackQuery, isPaginated);
        } else {
          throw e; // Re-throw other errors
        }
      }

    } catch (e) {
      console.error("Failed to fetch items:", e);
      setError("Gagal memuat data. Silakan periksa koneksi Anda.");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [mode, projectId, user, viewType, lastVisible]);


  React.useEffect(() => {
    fetchItems(true);
  }, [mode, projectId, viewType, user, fetchItems]);

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
      if (!userProfile) {
          toast({ variant: 'destructive', title: 'User profile not loaded.' });
          return;
      }
      const updatedItem = await shareObservationToPublic(observation, userProfile);
      if (updatedItem) updateItem(updatedItem);
  };
  
  const retryAnalysis = async (item: Observation) => {
      const updatedItem = await retryAiAnalysis(item);
      if (updatedItem) updateItem(updatedItem as Observation);
  };
  
  const updateStatus = async (observation: Observation, actionData: any) => {
    if (!user || !userProfile) return;
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
