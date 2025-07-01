
'use client';

import * as React from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  addDoc,
  where,
  Unsubscribe,
  DocumentReference,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Observation, Inspection, Ptw, AllItems, Scope } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useProjects } from '@/hooks/use-projects';
import {
  summarizeObservationData,
  analyzeInspectionData,
} from '@/ai/flows/summarize-observation-data';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { toggleLike } from '@/lib/actions/interaction-actions';

interface ObservationContextType {
  privateItems: AllItems[];
  projectItems: AllItems[];
  loading: boolean;
  addObservation: (
    formData: Omit<Observation, 'id' | 'scope' | 'projectId' | 'itemType'>,
    scope: Scope,
    projectId: string | null
  ) => Promise<void>;
  addInspection: (
    formData: Omit<Inspection, 'id' | 'scope' | 'projectId' | 'itemType'>,
    scope: Scope,
    projectId: string | null
  ) => Promise<void>;
  addPtw: (
    formData: Omit<Ptw, 'id' | 'scope' | 'projectId' | 'itemType'>,
    scope: Scope,
    projectId: string | null
  ) => Promise<void>;
  updateObservation: (observation: Observation, updatedData: Partial<Observation>) => Promise<void>;
  approvePtw: (
    ptw: Ptw,
    signatureDataUrl: string,
    approver: string,
  ) => Promise<void>;
  retryAiAnalysis: (item: Observation | Inspection) => Promise<void>;
  shareObservationToPublic: (observation: Observation) => Promise<void>;
  toggleLikeObservation: (observation: Observation) => Promise<void>;
}

const ObservationContext = React.createContext<
  ObservationContextType | undefined
>(undefined);

const getDocRef = (item: AllItems): DocumentReference => {
    const collectionName = `${item.itemType}s`;
    return doc(db, collectionName, item.id);
};

export function ObservationProvider({ children }: { children: React.ReactNode }) {
    const { user, userProfile, loading: authLoading } = useAuth();
    const { projects, loading: projectsLoading } = useProjects();
    
    const [privateItems, setPrivateItems] = React.useState<AllItems[]>([]);
    const [projectItems, setProjectItems] = React.useState<AllItems[]>([]);
    const [privateItemsLoading, setPrivateItemsLoading] = React.useState(true);
    const [projectItemsLoading, setProjectItemsLoading] = React.useState(true);

    const collectionsToWatch: ('observations' | 'inspections' | 'ptws')[] = ['observations', 'inspections', 'ptws'];
    
    const sortItemsByDate = (items: AllItems[]) => {
      return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    // Effect for Private Items
    React.useEffect(() => {
        if (!user) {
            setPrivateItems([]);
            setPrivateItemsLoading(false);
            return;
        }

        setPrivateItemsLoading(true);
        const listeners: Unsubscribe[] = [];
        
        const combinedQuery = query(
          collection(db, 'observations'), 
          where('userId', '==', user.uid), 
          where('scope', '==', 'private')
        );

        // This is a simplified listener. For multiple collections, you might need a more complex state management.
        const unsub = onSnapshot(combinedQuery, (snapshot) => {
            const allItems: AllItems[] = snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as AllItems);
            
            const itemPromises = collectionsToWatch.map(colName => {
                const q = query(collection(db, colName), where('userId', '==', user.uid), where('scope', '==', 'private'));
                return getDocs(q).then(snap => snap.docs.map(d => ({...d.data(), id: d.id, itemType: colName.slice(0, -1)} as AllItems)));
            });

            Promise.all(itemPromises).then(results => {
                const combined = results.flat();
                setPrivateItems(sortItemsByDate(combined));
                setPrivateItemsLoading(false);
            });

        }, e => {
            console.error(`Error fetching private items:`, e);
            setPrivateItemsLoading(false);
        });
            
        listeners.push(unsub);

        return () => listeners.forEach(unsub => unsub());
    }, [user]);

    // Effect for Project Items
    React.useEffect(() => {
        if (!user || projects.length === 0) {
            setProjectItems([]);
            setProjectItemsLoading(false);
            return;
        }

        setProjectItemsLoading(true);
        const projectIds = projects.map(p => p.id);
        if (projectIds.length === 0) {
            setProjectItemsLoading(false);
            return;
        }
        
        const itemPromises = collectionsToWatch.map(colName => {
            const q = query(collection(db, colName), where('projectId', 'in', projectIds));
            return getDocs(q).then(snap => snap.docs.map(d => ({...d.data(), id: d.id, itemType: colName.slice(0, -1)} as AllItems)));
        });

        Promise.all(itemPromises).then(results => {
            const combined = results.flat();
            setProjectItems(sortItemsByDate(combined));
            setProjectItemsLoading(false);
        }).catch(e => {
            console.error("Error fetching project items", e);
            setProjectItemsLoading(false);
        });

        // For real-time updates (optional, can be heavy)
        const listeners: Unsubscribe[] = [];
        collectionsToWatch.forEach(colName => {
            const q = query(collection(db, colName), where('projectId', 'in', projectIds));
            const unsub = onSnapshot(q, (snapshot) => {
                const newItems = snapshot.docs.map(d => ({...d.data(), id: d.id, itemType: colName.slice(0, -1) } as AllItems));
                setProjectItems(prev => {
                    const otherItems = prev.filter(item => item.itemType !== colName.slice(0, -1));
                    return sortItemsByDate([...otherItems, ...newItems]);
                });
            });
            listeners.push(unsub);
        });

        return () => listeners.forEach(unsub => unsub());

    }, [user, projects]);
    
    const _runObservationAiAnalysis = React.useCallback(async (observation: Observation) => {
      const observationDocRef = getDocRef(observation);
      const observationData = `
        Location: ${observation.location}, Company: ${observation.company}, Category: ${observation.category}, Risk Level: ${observation.riskLevel}, Submitted By: ${observation.submittedBy}, Date: ${new Date(observation.date).toLocaleString()}, Findings: ${observation.findings}, Recommendation: ${observation.recommendation}
      `;

      try {
        const summary = await summarizeObservationData({ observationData });
        const aiData = {
          aiSummary: summary.summary,
          aiRisks: summary.risks,
          aiSuggestedActions: summary.suggestedActions,
          aiRelevantRegulations: summary.relevantRegulations,
          aiSuggestedRiskLevel: summary.suggestedRiskLevel,
          aiRootCauseAnalysis: summary.rootCauseAnalysis,
          aiObserverSkillRating: summary.observerAssessment.rating,
          aiObserverSkillExplanation: summary.observerAssessment.explanation,
          aiStatus: 'completed' as const,
        };
        await updateDoc(observationDocRef, aiData);
      } catch (error) {
        console.error("Failed to generate AI summary for observation:", error);
        await updateDoc(observationDocRef, { aiStatus: 'failed' });
        toast({ variant: 'destructive', title: 'Observation AI Failed', description: 'Could not generate AI analysis.'});
      }
    }, []);

    const _runInspectionAiAnalysis = React.useCallback(async (inspection: Inspection) => {
      const inspectionDocRef = getDocRef(inspection);
      const inspectionData = `
        Equipment Name: ${inspection.equipmentName}, Type: ${inspection.equipmentType}, Location: ${inspection.location}, Status: ${inspection.status}, Submitted By: ${inspection.submittedBy}, Date: ${new Date(inspection.date).toLocaleString()}, Findings: ${inspection.findings}, Recommendation: ${inspection.recommendation || 'N/A'}
      `;

      try {
        const analysis = await analyzeInspectionData({ inspectionData });
        const aiData = {
            aiSummary: analysis.summary,
            aiRisks: analysis.risks,
            aiSuggestedActions: analysis.suggestedActions,
            aiStatus: 'completed' as const,
        };
        await updateDoc(inspectionDocRef, aiData);
      } catch (error) {
        console.error("Failed to generate AI analysis for inspection:", error);
        await updateDoc(inspectionDocRef, { aiStatus: 'failed' });
        toast({ variant: 'destructive', title: 'Inspection AI Failed', description: 'Could not generate AI analysis.'});
      }
    }, []);
    
    const addItem = React.useCallback(async (
        collectionName: 'observations' | 'inspections' | 'ptws',
        formData: Omit<AllItems, 'id' | 'itemType'>,
        scope: Scope,
        projectId: string | null
    ) => {
        if (!user) throw new Error("User not authenticated");

        const itemType = collectionName.slice(0, -1);
        const prefix = {
            observation: 'OBS',
            inspection: 'INSP',
            ptw: 'PTW'
        }[itemType];

        const referenceId = `${prefix}-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        let dataToSave: any = {
            ...formData,
            referenceId,
            scope,
            projectId,
            itemType,
        };

        if (itemType === 'observation') {
            dataToSave = {
              ...dataToSave,
              aiStatus: 'processing',
              likes: [],
              likeCount: 0,
              commentCount: 0,
              viewCount: 0,
            }
        } else if (itemType === 'inspection') {
            dataToSave.aiStatus = 'processing';
        }

        const docRef = await addDoc(collection(db, collectionName), dataToSave);
        
        const fullItemData = { ...dataToSave, id: docRef.id };

        if (fullItemData.itemType === 'observation') {
            _runObservationAiAnalysis(fullItemData as Observation);
        } else if (fullItemData.itemType === 'inspection') {
            _runInspectionAiAnalysis(fullItemData as Inspection);
        }
    }, [user, _runObservationAiAnalysis, _runInspectionAiAnalysis]);


    const addObservation = React.useCallback(async (formData: Omit<Observation, 'id'| 'itemType'>, scope: Scope, projectId: string | null) => {
        await addItem('observations', formData, scope, projectId);
    }, [addItem]);
    
    const addInspection = React.useCallback(async (formData: Omit<Inspection, 'id'| 'itemType'>, scope: Scope, projectId: string | null) => {
        await addItem('inspections', formData, scope, projectId);
    }, [addItem]);

    const addPtw = React.useCallback(async (formData: Omit<Ptw, 'id'| 'itemType'>, scope: Scope, projectId: string | null) => {
        await addItem('ptws', formData, scope, projectId);
    }, [addItem]);

    const updateObservation = React.useCallback(async (observation: Observation, updatedData: Partial<Observation>) => {
        const observationDocRef = getDocRef(observation);
        await updateDoc(observationDocRef, updatedData);
    }, []);

    const approvePtw = React.useCallback(async (ptw: Ptw, signatureDataUrl: string, approver: string) => {
        const ptwDocRef = getDocRef(ptw);
        await updateDoc(ptwDocRef, {
            status: 'Approved', signatureDataUrl, approver, approvedDate: new Date().toISOString(),
        });
    }, []);

    const retryAiAnalysis = React.useCallback(async (item: Observation | Inspection) => {
        const docRef = getDocRef(item);
        await updateDoc(docRef, { aiStatus: 'processing' });
        if (item.itemType === 'observation') {
            _runObservationAiAnalysis(item as Observation);
        } else if (item.itemType === 'inspection') {
            _runInspectionAiAnalysis(item as Inspection);
        }
    }, [_runObservationAiAnalysis, _runInspectionAiAnalysis]);

    const shareObservationToPublic = React.useCallback(async (observation: Observation) => {
        if (!user || !userProfile) {
          toast({ variant: 'destructive', title: 'User profile not loaded.', description: 'Please wait a moment and try again.'});
          throw new Error("User not authenticated or profile not loaded");
        }
        if (observation.scope === 'public' || observation.isSharedPublicly) {
            toast({ variant: 'default', title: 'Sudah Dibagikan', description: 'Observasi ini sudah ada di feed publik.' });
            return;
        }

        try {
            const { id, itemType, ...restOfObservation } = observation;
            const publicObservationData = {
                ...restOfObservation,
                itemType: 'observation',
                scope: 'public' as const,
                projectId: null,
                isSharedPublicly: false, // This is a new public doc, not a "share" of another
                sharedBy: userProfile.displayName,
                sharedByPosition: userProfile.position,
                originalId: id, // Link back to the original
            };
            
            await addDoc(collection(db, 'observations'), publicObservationData);
    
            const originalDocRef = getDocRef(observation);
            await updateDoc(originalDocRef, { isSharedPublicly: true });
    
            toast({ title: 'Berhasil!', description: 'Observasi telah dibagikan ke feed publik.' });
        } catch (error) {
            console.error("Failed to share observation to public:", error);
            toast({ variant: 'destructive', title: 'Gagal Membagikan', description: 'Tidak dapat membagikan observasi. Silakan coba lagi.' });
        }
    }, [user, userProfile]);

    const toggleLikeObservation = React.useCallback(async (observation: Observation) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Anda harus masuk untuk menyukai.' });
            return;
        }
        try {
            await toggleLike({
                docId: observation.id,
                userId: user.uid
            });
        } catch (error) {
            console.error('Failed to toggle like:', error);
            toast({ variant: 'destructive', title: 'Gagal', description: 'Tidak dapat memproses suka.'});
        }
    }, [user]);


    const value = { privateItems, projectItems, loading: authLoading || projectsLoading || privateItemsLoading || projectItemsLoading, addObservation, addInspection, addPtw, updateObservation, approvePtw, retryAiAnalysis, shareObservationToPublic, toggleLikeObservation };

    return (
        <ObservationContext.Provider value={value}>
        {children}
        </ObservationContext.Provider>
    );
}

export function useObservations() {
  const context = React.useContext(ObservationContext);
  if (context === undefined) {
    throw new Error('useObservations must be used within an ObservationProvider');
  }
  return context;
}
