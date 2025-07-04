
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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { AllItems, Scope, Observation, UserProfile, Inspection, Ptw } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { usePathname } from 'next/navigation';
import { toggleLike, incrementViewCount } from '@/lib/actions/interaction-actions';
import { 
  updateObservationStatus as updateObservationStatusAction, 
  updateInspectionStatus as updateInspectionStatusAction,
  retryAiAnalysis as retryAiAnalysisAction, 
  shareObservationToPublic as shareObservationToPublicAction, 
  deleteMultipleItems as deleteMultipleItemsAction
} from '@/lib/actions/item-actions';


const PAGE_SIZE = 10;

interface ObservationContextType {
  items: AllItems[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  fetchItems: (reset?: boolean) => void;
  addItem: (newItem: AllItems) => void;
  updateItem: (updatedItem: AllItems) => void;
  removeItem: (itemId: string) => void;
  removeMultipleItems: (itemsToRemove: AllItems[]) => Promise<void>;
  handleLikeToggle: (observationId: string) => Promise<void>;
  handleViewCount: (observationId: string) => void;
  shareToPublic: (observation: Observation) => Promise<void>;
  retryAnalysis: (item: Observation | Inspection) => Promise<void>;
  updateObservationStatus: (observation: Observation, actionData: { actionTakenDescription: string; actionTakenPhotoUrl?: string }, user: UserProfile) => Promise<void>;
  updateInspectionStatus: (inspection: Inspection, actionData: { actionTakenDescription: string; actionTakenPhotoUrl?: string }, user: UserProfile) => Promise<void>;
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

    if (mode === 'public') {
      baseQuery = query(baseQuery, where('scope', '==', 'public'));
    } else if (mode === 'project' && projectId) {
      baseQuery = query(baseQuery, where('projectId', '==', projectId));
    } else if (mode === 'private' && user) {
      baseQuery = query(baseQuery, where('scope', '==', 'private'), where('userId', '==', user.uid));
    } else {
      setItems([]); setIsLoading(false); return;
    }
    
    const finalQuery = query(
      baseQuery, 
      orderBy('date', 'desc'), 
      ...(lastDoc ? [startAfter(lastDoc)] : []),
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
            setError("Database query failed. Please ensure all required indexes are built in the Firebase Console.");
            console.error("Firestore index missing error. Please verify the required composite indexes.", e);
        } else {
            console.error("Failed to fetch items:", e);
            setError("Failed to load data. Please check your connection.");
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


  const addItem = React.useCallback((newItem: AllItems) => {
    const currentViewItemType = viewType.slice(0, -1);
    const currentScope = mode;
    const currentProjectId = projectId;
  
    const viewTypeMatches = newItem.itemType === currentViewItemType;
  
    let scopeMatches = false;
    if (currentScope === 'public' && newItem.scope === 'public') {
      scopeMatches = true;
    } else if (currentScope === 'private' && newItem.scope === 'private') {
      scopeMatches = true;
    } else if (currentScope === 'project' && newItem.scope === 'project' && newItem.projectId === currentProjectId) {
      scopeMatches = true;
    }
  
    if (viewTypeMatches && scopeMatches) {
      setItems(prevItems => [newItem, ...prevItems]);
    }
  }, [viewType, mode, projectId]);


  const updateItem = React.useCallback((updatedItem: AllItems) => {
    setItems(prevItems => prevItems.map(item => item.id === updatedItem.id ? updatedItem : item));
  }, []);
  
  const removeItem = React.useCallback((itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  }, []);
  
  const removeMultipleItems = React.useCallback(async (itemsToRemove: AllItems[]) => {
      await deleteMultipleItemsAction(itemsToRemove);
  }, []);

  const handleLikeToggle = React.useCallback(async (observationId: string) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'You must be logged in to like.' });
        return;
    }
    
    setItems(prevItems => {
        const itemIndex = prevItems.findIndex(item => item.id === observationId);
        if (itemIndex === -1 || prevItems[itemIndex].itemType !== 'observation') {
            return prevItems;
        }
        const originalObservation = prevItems[itemIndex] as Observation;
        const originalLikes = Array.isArray(originalObservation.likes) ? originalObservation.likes : [];
        const hasLiked = originalLikes.includes(user.uid);
        const newLikes = hasLiked ? originalLikes.filter(uid => uid !== user.uid) : [...originalLikes, user.uid];
        const updatedObservation: Observation = { ...originalObservation, likes: newLikes, likeCount: newLikes.length };
        const newItems = [...prevItems];
        newItems[itemIndex] = updatedObservation;
        return newItems;
    });

    try {
        await toggleLike({ docId: observationId, userId: user.uid, collectionName: 'observations' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal Memproses Suka', description: 'Gagal menyinkronkan dengan server.' });
        console.error("Failed to process like on server:", error);
    }
  }, [user, toast]);
  
  const handleViewCount = React.useCallback((observationId: string) => {
      setItems(prevItems => {
        const itemIndex = prevItems.findIndex(item => item.id === observationId);
        if (itemIndex === -1 || prevItems[itemIndex].itemType !== 'observation') return prevItems;
        const currentObservation = prevItems[itemIndex] as Observation;
        const updatedObservation: Observation = { ...currentObservation, viewCount: (currentObservation.viewCount || 0) + 1 };
        const newItems = [...prevItems];
        newItems[itemIndex] = updatedObservation;
        return newItems;
    });
    incrementViewCount({ docId: observationId, collectionName: 'observations' });
  }, []);
  
  const shareToPublicHandler = React.useCallback(async (observation: Observation) => {
      if (!userProfile) {
          toast({ variant: 'destructive', title: 'User profile not loaded.' }); return;
      }
      const updatedItem = await shareObservationToPublicAction(observation, userProfile);
      if (updatedItem) updateItem(updatedItem);
  }, [userProfile, toast, updateItem]);
  
  const retryAnalysis = React.useCallback(async (item: Observation | Inspection) => {
      const updatedItem = await retryAiAnalysisAction(item);
      if (updatedItem) updateItem(updatedItem as AllItems);
  }, [updateItem]);
  
  const updateObservationStatusHandler = React.useCallback(async (observation: Observation, actionData: any, user: UserProfile) => {
    const updatedItem = await updateObservationStatusAction({
      observationId: observation.id,
      actionData,
      userName: user.displayName,
      userPosition: user.position,
    });
    if(updatedItem) updateItem(updatedItem);
  }, [updateItem]);

  const updateInspectionStatusHandler = React.useCallback(async (inspection: Inspection, actionData: any, user: UserProfile) => {
    const updatedItem = await updateInspectionStatusAction({
      inspectionId: inspection.id,
      actionData,
      userName: user.displayName,
      userPosition: user.position,
    });
    if(updatedItem) updateItem(updatedItem);
  }, [updateItem]);

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
    fetchItems: resetAndFetch,
    addItem, updateItem, removeItem, removeMultipleItems,
    handleLikeToggle, handleViewCount, shareToPublic: shareToPublicHandler, retryAnalysis, 
    updateObservationStatus: updateObservationStatusHandler,
    updateInspectionStatus: updateInspectionStatusHandler,
    viewType, setViewType, getObservationById, getInspectionById, getPtwById
  }), [
      items, isLoading, hasMore, error,
      resetAndFetch, addItem, updateItem, removeItem, removeMultipleItems,
      handleLikeToggle, handleViewCount, shareToPublicHandler, retryAnalysis, 
      updateObservationStatusHandler, updateInspectionStatusHandler,
      viewType, getObservationById, getInspectionById, getPtwById
  ]);

  return <ObservationContext.Provider value={value}>{children}</ObservationContext.Provider>;
}
