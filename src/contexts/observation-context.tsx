
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
        if (item.scope === 'project' && item.projectId) {
            return doc(db, 'projects', item.projectId, itemTypePlural, item.id);
        }
        return doc(db, itemTypePlural, item.id);
    };

    // Listener for "My Items" (Personal & Project-based data).
    React.useEffect(() => {
        if (projectsLoading) return; 
        if (!user) {
            setMyItems([]);
            setMyItemsLoading(false);
            return;
        }

        setMyItemsLoading(true);
        const itemMap = new Map<string, AllItems>();
        const allUnsubs: Unsubscribe[] = [];
        
        let listenerCount = collectionsToWatch.length + (projects.length * collectionsToWatch.length);
        let loadedListenerCount = 0;

        const processAndSort = (isInitial: boolean) => {
             setMyItems(sortItemsByDate(Array.from(itemMap.values())));
             if(isInitial) {
                loadedListenerCount++;
                if(loadedListenerCount >= listenerCount) {
                    setMyItemsLoading(false);
                }
             }
        }

        collectionsToWatch.forEach(colName => {
            const itemType = colName.slice(0, -1) as 'observation' | 'inspection' | 'ptw';
            const privateQuery = query(collection(db, colName), where('userId', '==', user.uid), where('scope', '==', 'private'));
            let isInitial = true;
            
            const unsub = onSnapshot(privateQuery, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    const docId = change.doc.id;
                    const itemData = { ...change.doc.data(), id: docId, itemType } as AllItems;
                    if (change.type === 'removed') {
                        itemMap.delete(docId);
                    } else {
                        itemMap.set(docId, itemData);
                    }
                });
                processAndSort(isInitial);
                isInitial = false;
            }, (e) => {
                console.error(`Error fetching private ${colName}: `, e);
                processAndSort(isInitial);
                isInitial = false;
            });
            allUnsubs.push(unsub);
        });

        projects.forEach(project => {
            collectionsToWatch.forEach(colName => {
                const itemType = colName.slice(0, -1) as 'observation' | 'inspection' | 'ptw';
                const projectItemsQuery = query(collection(db, 'projects', project.id, colName));
                let isInitial = true;
                
                const unsub = onSnapshot(projectItemsQuery, (snapshot) => {
                     snapshot.docChanges().forEach((change) => {
                        const docId = change.doc.id;
                        if (change.type === 'removed') {
                            itemMap.delete(docId);
                        } else {
                            itemMap.set(docId, {
                                ...change.doc.data(),
                                id: docId,
                                itemType,
                                scope: 'project',
                                projectId: project.id,
                            } as AllItems);
                        }
                    });
                    processAndSort(isInitial);
                    isInitial = false;
                }, (e) => {
                    console.error(`Error fetching from project ${project.id}/${colName}: `, e);
                    processAndSort(isInitial);
                    isInitial = false;
                });
                allUnsubs.push(unsub);
            });
        });

        if (listenerCount === 0) {
            setMyItemsLoading(false);
        }

        return () => {
            allUnsubs.forEach(unsub => unsub());
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
      const observationToSave = { ...newObservation, referenceId, aiStatus: 'processing' as const, userId: user.uid };
      
      let collectionRef: CollectionReference;
      let dataToSave: Omit<typeof observationToSave, 'scope' | 'projectId'> | typeof observationToSave;

      if (observationToSave.scope === 'project' && observationToSave.projectId) {
        collectionRef = collection(db, 'projects', observationToSave.projectId, 'observations');
        const { scope, projectId, ...rest } = observationToSave;
        dataToSave = rest;
      } else {
        collectionRef = collection(db, 'observations');
        dataToSave = observationToSave;
      }

      const docRef = await addDoc(collectionRef, dataToSave);
      _runObservationAiAnalysis({ ...observationToSave, id: docRef.id, itemType: 'observation' });
    }, [user, _runObservationAiAnalysis]);

    const addInspection = React.useCallback(async (newInspection: Omit<Inspection, 'id' | 'referenceId'>) => {
      if(!user) throw new Error("User not authenticated");
      const referenceId = `INSP-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const inspectionToSave = { ...newInspection, referenceId, aiStatus: 'processing' as const, userId: user.uid };

      let collectionRef: CollectionReference;
      let dataToSave: Omit<typeof inspectionToSave, 'scope' | 'projectId'> | typeof inspectionToSave;

      if (inspectionToSave.scope === 'project' && inspectionToSave.projectId) {
        collectionRef = collection(db, 'projects', inspectionToSave.projectId, 'inspections');
        const { scope, projectId, ...rest } = inspectionToSave;
        dataToSave = rest;
      } else {
        collectionRef = collection(db, 'inspections');
        dataToSave = inspectionToSave;
      }

      const docRef = await addDoc(collectionRef, dataToSave);
      _runInspectionAiAnalysis({ ...inspectionToSave, id: docRef.id, itemType: 'inspection' });
    }, [user, _runInspectionAiAnalysis]);

    const addPtw = React.useCallback(async (newPtw: Omit<Ptw, 'id' | 'referenceId'>) => {
        if(!user) throw new Error("User not authenticated");
        const referenceId = `PTW-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const ptwToSave = { ...newPtw, referenceId, userId: user.uid };

        let collectionRef: CollectionReference;
        let dataToSave: Omit<typeof ptwToSave, 'scope' | 'projectId'> | typeof ptwToSave;

        if (ptwToSave.scope === 'project' && ptwToSave.projectId) {
            collectionRef = collection(db, 'projects', ptwToSave.projectId, 'ptws');
            const { scope, projectId, ...rest } = ptwToSave;
            dataToSave = rest;
        } else {
            collectionRef = collection(db, 'ptws');
            dataToSave = ptwToSave;
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
