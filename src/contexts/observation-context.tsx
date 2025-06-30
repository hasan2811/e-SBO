
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
  QuerySnapshot,
  DocumentReference,
  CollectionReference,
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
  publicItems: AllItems[];
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
    
    const [publicItems, setPublicItems] = React.useState<AllItems[]>([]);
    const [myItems, setMyItems] = React.useState<AllItems[]>([]);
    const [loading, setLoading] = React.useState(true);

    const collectionsToWatch: ('observations' | 'inspections' | 'ptws')[] = ['observations', 'inspections', 'ptws'];
    
    // Sort helper function
    const sortItemsByDate = (items: AllItems[]) => {
      return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    // Listener for public data.
     React.useEffect(() => {
        setLoading(true);
        const itemMap = new Map<string, AllItems>();

        const processSnapshot = (snapshot: QuerySnapshot, itemType: 'observation' | 'inspection' | 'ptw') => {
            snapshot.docChanges().forEach((change) => {
              const docId = change.doc.id;
              if (change.type === 'removed') {
                itemMap.delete(docId);
              } else {
                itemMap.set(docId, { ...change.doc.data(), id: docId, itemType } as AllItems);
              }
            });
            setPublicItems(sortItemsByDate(Array.from(itemMap.values())));
        };

        const unsubs = collectionsToWatch.flatMap(colName => {
            const itemType = colName.slice(0, -1) as 'observation' | 'inspection' | 'ptw';
            // REMOVED orderBy to prevent index errors
            const publicQuery = query(collection(db, colName), where('scope', '==', 'public'));
            return onSnapshot(publicQuery, (snapshot) => processSnapshot(snapshot, itemType), (error) => console.error(`Error fetching public ${colName}:`, error));
        });
        
        const timer = setTimeout(() => setLoading(false), 1500);

        return () => {
            unsubs.forEach(unsub => unsub());
            clearTimeout(timer);
        };
    }, []);

    // Listener for personal and project data.
    React.useEffect(() => {
        if (projectsLoading) return;
        if (!user) {
            setMyItems([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const itemMap = new Map<string, AllItems>();
        let allUnsubs: Unsubscribe[] = [];

        const processAndSort = () => {
             setMyItems(sortItemsByDate(Array.from(itemMap.values())));
             setLoading(false);
        }

        const createSnapshotProcessor = (itemType: 'observation' | 'inspection' | 'ptw', isProject: boolean, projectId?: string) => (snapshot: QuerySnapshot) => {
             snapshot.docChanges().forEach((change) => {
                const docData = change.doc.data();
                const docId = change.doc.id;
                
                // For root collection queries, only include 'private' scope items.
                if (!isProject && docData.scope !== 'private') {
                    if (itemMap.has(docId)) {
                        itemMap.delete(docId);
                    }
                    return; 
                }

                const itemData = { 
                    ...docData, 
                    id: docId, 
                    itemType,
                    ...(isProject && { projectId, scope: 'project' }) 
                } as AllItems;

                if (change.type === "removed") {
                    itemMap.delete(docId);
                } else {
                    itemMap.set(docId, itemData);
                }
            });
            processAndSort();
        };
        
        // 1. Listen to the user's private items from root collections
        collectionsToWatch.forEach(colName => {
            const itemType = colName.slice(0, -1) as 'observation' | 'inspection' | 'ptw';
            // REMOVED orderBy and scope filter to prevent index errors. Scope is filtered in the processor.
            const privateQuery = query(collection(db, colName), where('userId', '==', user.uid));
            allUnsubs.push(onSnapshot(privateQuery, createSnapshotProcessor(itemType, false), (e) => console.error(`Error fetching personal ${colName}: `, e)));
        });

        // 2. Listen to items in subcollections for each project
        projects.forEach(project => {
            collectionsToWatch.forEach(colName => {
                const itemType = colName.slice(0, -1) as 'observation' | 'inspection' | 'ptw';
                // REMOVED orderBy to prevent index errors
                const projectCollectionQuery = query(collection(db, 'projects', project.id, colName));
                allUnsubs.push(onSnapshot(projectCollectionQuery, createSnapshotProcessor(itemType, true, project.id), (e) => console.error(`Error fetching from project ${project.id}/${colName}: `, e)));
            });
        });
        
        // Finalize loading state if no projects
        if (!projectsLoading && projects.length === 0) {
            processAndSort();
        }

        return () => {
            allUnsubs.forEach(unsub => unsub());
        };

    }, [user, projects, projectsLoading]);

    const getDocRef = (item: Observation | Inspection | Ptw): DocumentReference => {
        const itemTypePlural = `${item.itemType}s` as 'observations' | 'inspections' | 'ptws';
        if (item.scope === 'project' && item.projectId) {
            return doc(db, 'projects', item.projectId, itemTypePlural, item.id);
        }
        return doc(db, itemTypePlural, item.id);
    };
    
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
      const observationToSave = { ...newObservation, referenceId, aiStatus: 'processing' as const, userId: user.uid };
      
      let collectionRef: CollectionReference;
      let dataToSave: any = observationToSave;

      if (observationToSave.scope === 'project' && observationToSave.projectId) {
        collectionRef = collection(db, 'projects', observationToSave.projectId, 'observations');
        const { projectId, ...rest } = observationToSave;
        dataToSave = rest;
      } else {
        collectionRef = collection(db, 'observations');
      }

      const docRef = await addDoc(collectionRef, dataToSave);
      _runObservationAiAnalysis({ ...observationToSave, id: docRef.id, itemType: 'observation' });
    }, [user, _runObservationAiAnalysis]);

    const addInspection = React.useCallback(async (newInspection: Omit<Inspection, 'id' | 'referenceId'>) => {
      if(!user) throw new Error("User not authenticated");
      const referenceId = `INSP-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const inspectionToSave = { ...newInspection, referenceId, aiStatus: 'processing' as const, userId: user.uid };

      let collectionRef: CollectionReference;
      let dataToSave: any = inspectionToSave;

      if (inspectionToSave.scope === 'project' && inspectionToSave.projectId) {
        collectionRef = collection(db, 'projects', inspectionToSave.projectId, 'inspections');
        const { projectId, ...rest } = inspectionToSave;
        dataToSave = rest;
      } else {
        collectionRef = collection(db, 'inspections');
      }

      const docRef = await addDoc(collectionRef, dataToSave);
      _runInspectionAiAnalysis({ ...inspectionToSave, id: docRef.id, itemType: 'inspection' });
    }, [user, _runInspectionAiAnalysis]);

    const addPtw = React.useCallback(async (newPtw: Omit<Ptw, 'id' | 'referenceId'>) => {
        if(!user) throw new Error("User not authenticated");
        const referenceId = `PTW-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const ptwToSave = { ...newPtw, referenceId, userId: user.uid };

        let collectionRef: CollectionReference;
        let dataToSave: any = ptwToSave;

        if (ptwToSave.scope === 'project' && ptwToSave.projectId) {
            collectionRef = collection(db, 'projects', ptwToSave.projectId, 'ptws');
            const { projectId, ...rest } = ptwToSave;
            dataToSave = rest;
        } else {
            collectionRef = collection(db, 'ptws');
        }

        await addDoc(collectionRef, dataToSave);
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

    const value = { publicItems, myItems, loading, addObservation, addInspection, addPtw, updateObservation, approvePtw, retryAiAnalysis };

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
