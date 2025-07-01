
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
import type { Observation, Inspection, Ptw, AllItems } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useProjects } from '@/hooks/use-projects';
import {
  summarizeObservationData,
  analyzeInspectionData,
} from '@/ai/flows/summarize-observation-data';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ObservationContextType {
  myItems: AllItems[];
  loading: boolean;
  addObservation: (
    observation: Omit<Observation, 'id' | 'referenceId'>
  ) => Promise<void>;
  addInspection: (
    inspection: Omit<Inspection, 'id' | 'referenceId'>
  ) => Promise<void>;
  addPtw: (ptw: Omit<Ptw, 'id' | 'referenceId'>) => Promise<void>;
  updateObservation: (observation: Observation, updatedData: Partial<Observation>) => Promise<void>;
  approvePtw: (
    ptw: Ptw,
    signatureDataUrl: string,
    approver: string,
  ) => Promise<void>;
  retryAiAnalysis: (item: Observation | Inspection) => Promise<void>;
}

const ObservationContext = React.createContext<
  ObservationContextType | undefined
>(undefined);


export function ObservationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { projects, loading: projectsLoading } = useProjects();
    
    const [myItems, setMyItems] = React.useState<AllItems[]>([]);
    const [myItemsLoading, setMyItemsLoading] = React.useState(true);

    const loading = myItemsLoading || projectsLoading;

    const collectionsToWatch: ('observations' | 'inspections' | 'ptws')[] = ['observations', 'inspections', 'ptws'];
    
    const sortItemsByDate = (items: AllItems[]) => {
      return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const getDocRef = (item: AllItems): DocumentReference => {
        const itemTypePlural = `${item.itemType}s` as 'observations' | 'inspections' | 'ptws';
        if (item.projectId) {
            return doc(db, 'projects', item.projectId, itemTypePlural, item.id);
        }
        return doc(db, itemTypePlural, item.id);
    };

    React.useEffect(() => {
        if (!user) {
            setMyItems([]);
            setMyItemsLoading(false);
            return;
        }

        setMyItemsLoading(true);
        const itemMap = new Map<string, AllItems>();
        const allUnsubs: Unsubscribe[] = [];

        const processSnapshot = (snapshot: any, itemType: 'observation' | 'inspection' | 'ptw', isProject: boolean, projectId?: string) => {
            snapshot.docChanges().forEach((change: any) => {
                const docId = change.doc.id;
                const key = projectId ? `${projectId}-${docId}` : docId;

                if (change.type === 'removed') {
                    itemMap.delete(key);
                } else {
                    itemMap.set(key, {
                        ...change.doc.data(),
                        id: docId,
                        itemType,
                        scope: isProject ? 'project' : change.doc.data().scope,
                        projectId: projectId || null,
                    } as AllItems);
                }
            });
            setMyItems(sortItemsByDate(Array.from(itemMap.values())));
        };
        
        // Listen to top-level collections for user's private, non-project items
        collectionsToWatch.forEach(colName => {
            const itemType = colName.slice(0, -1) as 'observation' | 'inspection' | 'ptw';
            const userItemsQuery = query(collection(db, colName), where('userId', '==', user.uid), where('projectId', '==', null));
            const unsub = onSnapshot(userItemsQuery, (snapshot) => {
                processSnapshot(snapshot, itemType, false);
            }, (e) => console.error(`Error fetching user ${colName}:`, e));
            allUnsubs.push(unsub);
        });

        // Listen to project sub-collections
        if (!projectsLoading && projects.length > 0) {
            projects.forEach(project => {
                collectionsToWatch.forEach(colName => {
                    const itemType = colName.slice(0, -1) as 'observation' | 'inspection' | 'ptw';
                    const projectItemsQuery = query(collection(db, 'projects', project.id, colName));
                    
                    const unsub = onSnapshot(projectItemsQuery, (snapshot) => {
                         processSnapshot(snapshot, itemType, true, project.id);
                    }, (e) => console.error(`Error fetching from project ${project.id}/${colName}:`, e));
                    allUnsubs.push(unsub);
                });
            });
        }

        // A simple timeout to set loading to false, as managing multiple listeners is complex.
        // This ensures the loading state doesn't get stuck.
        const loadingTimeout = setTimeout(() => {
            setMyItemsLoading(false);
        }, 3000); 

        return () => {
            allUnsubs.forEach(unsub => unsub());
            clearTimeout(loadingTimeout);
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
    
    const addObservation = React.useCallback(async (newObservation: Omit<Observation, 'id' | 'referenceId'>) => {
      if(!user) throw new Error("User not authenticated");
      const referenceId = `OBS-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const observationToSave = { ...newObservation, referenceId, aiStatus: 'processing' as const, userId: user.uid, projectId: null };
      
      const collectionRef: CollectionReference = collection(db, 'observations');
      const docRef = await addDoc(collectionRef, observationToSave);
      _runObservationAiAnalysis({ ...observationToSave, id: docRef.id, itemType: 'observation' });
    }, [user, _runObservationAiAnalysis]);

    const addInspection = React.useCallback(async (newInspection: Omit<Inspection, 'id' | 'referenceId'>) => {
      if(!user) throw new Error("User not authenticated");
      const referenceId = `INSP-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const inspectionToSave = { ...newInspection, referenceId, aiStatus: 'processing' as const, userId: user.uid, projectId: null };

      const collectionRef: CollectionReference = collection(db, 'inspections');
      const docRef = await addDoc(collectionRef, inspectionToSave);
      _runInspectionAiAnalysis({ ...inspectionToSave, id: docRef.id, itemType: 'inspection' });
    }, [user, _runInspectionAiAnalysis]);

    const addPtw = React.useCallback(async (newPtw: Omit<Ptw, 'id' | 'referenceId'>) => {
        if(!user) throw new Error("User not authenticated");
        const referenceId = `PTW-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const ptwToSave = { ...newPtw, referenceId, userId: user.uid, projectId: null };

        const collectionRef: CollectionReference = collection(db, 'ptws');
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

    const value = { myItems, loading, addObservation, addInspection, addPtw, updateObservation, approvePtw, retryAiAnalysis };

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

    