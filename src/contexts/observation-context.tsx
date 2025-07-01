
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
  CollectionReference,
  DocumentReference,
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
    formData: Omit<Observation, 'id' | 'scope' | 'projectId'>,
    scope: Scope,
    projectId: string | null
  ) => Promise<void>;
  addInspection: (
    formData: Omit<Inspection, 'id' | 'scope' | 'projectId'>,
    scope: Scope,
    projectId: string | null
  ) => Promise<void>;
  addPtw: (
    formData: Omit<Ptw, 'id' | 'scope' | 'projectId'>,
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

    const getDocRef = (item: AllItems): DocumentReference => {
        const itemTypePlural = item.itemType === 'ptw' ? 'ptws' : `${item.itemType}s`;
        
        if (item.scope === 'public') {
            return doc(db, itemTypePlural, item.id);
        }
        
        if (item.projectId) {
            return doc(db, 'projects', item.projectId, itemTypePlural, item.id);
        }
        
        return doc(db, itemTypePlural, item.id);
    };

    // Effect for Private Items - with accurate loading state
    React.useEffect(() => {
        if (!user) {
            setPrivateItems([]);
            setPrivateItemsLoading(false);
            return;
        }

        setPrivateItemsLoading(true);
        const privateListeners: Unsubscribe[] = [];

        collectionsToWatch.forEach(colName => {
            const itemType = colName.slice(0, -1) as 'observation' | 'inspection' | 'ptw';
            const q = query(collection(db, colName), where('userId', '==', user.uid), where('scope', '==', 'private'));
            
            const unsub = onSnapshot(q, (snapshot) => {
                setPrivateItems(prev => {
                    const newItemsMap = new Map(prev.map(item => [item.id, item]));
                    snapshot.docChanges().forEach(change => {
                        if (change.type === 'removed') {
                            newItemsMap.delete(change.doc.id);
                        } else {
                            newItemsMap.set(change.doc.id, { ...change.doc.data(), id: change.doc.id, itemType, projectId: null } as AllItems);
                        }
                    });
                    return sortItemsByDate(Array.from(newItemsMap.values()));
                });
                setPrivateItemsLoading(false);
            }, e => {
                console.error(`Error fetching private ${colName}:`, e);
                setPrivateItemsLoading(false);
            });
            privateListeners.push(unsub);
        });

        return () => {
            privateListeners.forEach(unsub => unsub());
        };
    }, [user]);

    // Effect for Project Items - with accurate loading state
    React.useEffect(() => {
        if (!user || projectsLoading) {
            setProjectItems([]);
            setProjectItemsLoading(true); 
            return;
        }
        
        if (projects.length === 0) {
            setProjectItems([]);
            setProjectItemsLoading(false);
            return;
        }

        setProjectItemsLoading(true);
        const projectListeners: Unsubscribe[] = [];
        
        projects.forEach(project => {
            collectionsToWatch.forEach(colName => {
                const itemType = colName.slice(0, -1) as 'observation' | 'inspection' | 'ptw';
                const projectItemsQuery = query(collection(db, 'projects', project.id, colName));
                
                const unsub = onSnapshot(projectItemsQuery, (snapshot) => {
                    setProjectItems(prev => {
                         const newItemsMap = new Map(prev.map(item => [`${item.projectId}-${item.id}`, item]));
                         snapshot.docChanges().forEach(change => {
                            const key = `${project.id}-${change.doc.id}`;
                            if (change.type === 'removed') {
                                newItemsMap.delete(key);
                            } else {
                                newItemsMap.set(key, { ...change.doc.data(), id: change.doc.id, itemType, projectId: project.id } as AllItems);
                            }
                         });
                         return sortItemsByDate(Array.from(newItemsMap.values()));
                    });
                    setProjectItemsLoading(false); 
                }, e => {
                    console.error(`Error fetching from project ${project.id}/${colName}:`, e);
                    setProjectItemsLoading(false);
                });
                projectListeners.push(unsub);
            });
        });

        return () => {
            projectListeners.forEach(unsub => unsub());
        };
    }, [user, projects, projectsLoading]);
    
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
    
    const addObservation = React.useCallback(async (formData: Omit<Observation, 'id' | 'scope' | 'projectId'>, scope: Scope, projectId: string | null) => {
        if(!user) throw new Error("User not authenticated");
        const referenceId = `OBS-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        const observationToSave = { 
            ...formData,
            scope,
            projectId,
            referenceId,
            aiStatus: 'processing' as const,
            likes: [],
            likeCount: 0,
            commentCount: 0,
            viewCount: 0,
        };
        
        let collectionRef: CollectionReference;
        if (scope === 'project' && projectId) {
            collectionRef = collection(db, 'projects', projectId, 'observations');
        } else {
            collectionRef = collection(db, 'observations');
        }

        const docRef = await addDoc(collectionRef, observationToSave);
        _runObservationAiAnalysis({ ...observationToSave, id: docRef.id, itemType: 'observation' });
    }, [user, _runObservationAiAnalysis]);

    const addInspection = React.useCallback(async (formData: Omit<Inspection, 'id' | 'scope' | 'projectId'>, scope: Scope, projectId: string | null) => {
        if(!user) throw new Error("User not authenticated");
        const referenceId = `INSP-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        const inspectionToSave = { 
            ...formData,
            scope,
            projectId,
            referenceId, 
            aiStatus: 'processing' as const, 
        };

        let collectionRef: CollectionReference;
        if (scope === 'project' && projectId) {
            collectionRef = collection(db, 'projects', projectId, 'inspections');
        } else {
            collectionRef = collection(db, 'inspections');
        }
        
        const docRef = await addDoc(collectionRef, inspectionToSave);
        _runInspectionAiAnalysis({ ...inspectionToSave, id: docRef.id, itemType: 'inspection' });
    }, [user, _runInspectionAiAnalysis]);

    const addPtw = React.useCallback(async (formData: Omit<Ptw, 'id' | 'scope' | 'projectId'>, scope: Scope, projectId: string | null) => {
        if(!user) throw new Error("User not authenticated");
        const referenceId = `PTW-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        const ptwToSave = { 
            ...formData,
            scope,
            projectId,
            referenceId,
        };

        let collectionRef: CollectionReference;
        if (scope === 'project' && projectId) {
            collectionRef = collection(db, 'projects', projectId, 'ptws');
        } else {
            collectionRef = collection(db, 'ptws');
        }
        await addDoc(collectionRef, ptwToSave);
    }, [user]);

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
            // 1. Create a copy for the public feed
            const { id, ...restOfObservation } = observation;
            const publicObservationData = {
                ...restOfObservation,
                scope: 'public' as const,
                projectId: null,
                isSharedPublicly: false, // The public copy itself isn't 'shared'
                sharedBy: userProfile.displayName,
                sharedByPosition: userProfile.position,
            };
            
            await addDoc(collection(db, 'observations'), publicObservationData);
    
            // 2. Update the original observation to mark it as shared
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
                userId: user.uid,
                scope: observation.scope,
                projectId: observation.projectId,
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
