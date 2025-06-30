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
  orderBy,
  Unsubscribe,
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
  updateObservation: (id: string, updatedData: Partial<Observation>) => Promise<void>;
  approvePtw: (
    id: string,
    signatureDataUrl: string,
    approver: string
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

    // Listener for public data
    React.useEffect(() => {
        setLoading(true);
        const unsubs: Unsubscribe[] = [];

        collectionsToWatch.forEach(colName => {
            const publicQuery = query(collection(db, colName), where('scope', '==', 'public'), orderBy('date', 'desc'));
            const unsub = onSnapshot(publicQuery, (snapshot) => {
                const fetchedItems = snapshot.docs.map(d => ({ ...d.data(), id: d.id, itemType: colName.slice(0, -1) as any }));
                setPublicItems(prev => {
                    const otherItems = prev.filter(item => item.itemType !== colName.slice(0, -1));
                    return [...otherItems, ...fetchedItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                });
            }, (error) => console.error(`Error fetching public ${colName}:`, error));
            unsubs.push(unsub);
        });
        
        // This is a proxy for all public listeners being set up
        const timer = setTimeout(() => setLoading(false), 800);

        return () => {
            unsubs.forEach(unsub => unsub());
            clearTimeout(timer);
        };
    }, []); // Runs once

    // Listener for personal and project data
    React.useEffect(() => {
        if (projectsLoading) return; // Wait until projects are loaded

        if (!user) {
            setMyItems([]);
            return;
        }

        const allUnsubs: Unsubscribe[] = [];
        const itemMap = new Map<string, AllItems>();

        const processSnapshot = (snapshot: any, itemType: string) => {
            snapshot.docs.forEach((d: any) => {
                const item = { ...d.data(), id: d.id, itemType };
                itemMap.set(item.id, item);
            });
            const sortedItems = Array.from(itemMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setMyItems(sortedItems);
        };
        
        collectionsToWatch.forEach(colName => {
            const itemType = colName.slice(0, -1);

            // Query 1: Get all items created by the user
            const myItemsQuery = query(collection(db, colName), where('userId', '==', user.uid), orderBy('date', 'desc'));
            const myItemsUnsub = onSnapshot(myItemsQuery, (snapshot) => processSnapshot(snapshot, itemType), 
                (err) => console.error(`Error fetching personal ${colName}: `, err)
            );
            allUnsubs.push(myItemsUnsub);

            // Query 2: Get all items from projects the user is a member of
            const projectIds = projects.map(p => p.id);
            if (projectIds.length > 0) {
                 const projectItemsQuery = query(collection(db, colName), where('projectId', 'in', projectIds), orderBy('date', 'desc'));
                 const projectItemsUnsub = onSnapshot(projectItemsQuery, (snapshot) => processSnapshot(snapshot, itemType),
                    (err) => console.error(`Error fetching project ${colName}: `, err)
                 );
                 allUnsubs.push(projectItemsUnsub);
            }
        });

        return () => {
            allUnsubs.forEach(unsub => unsub());
        };

    }, [user, projects, projectsLoading]);


    const _runObservationAiAnalysis = React.useCallback(async (observation: Observation) => {
      const observationDocRef = doc(db, 'observations', observation.id);
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
      const inspectionDocRef = doc(db, 'inspections', inspection.id);
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
      const observationCollection = collection(db, 'observations');
      const docRef = await addDoc(observationCollection, observationToSave);
      _runObservationAiAnalysis({ ...observationToSave, id: docRef.id, itemType: 'observation' });
    }, [user, _runObservationAiAnalysis]);

    const addInspection = React.useCallback(async (newInspection: Omit<Inspection, 'id' | 'referenceId'>) => {
      if(!user) throw new Error("User not authenticated");
      const referenceId = `INSP-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const inspectionToSave = { ...newInspection, referenceId, aiStatus: 'processing' as const, userId: user.uid };
      const inspectionCollection = collection(db, 'inspections');
      const docRef = await addDoc(inspectionCollection, inspectionToSave);
      _runInspectionAiAnalysis({ ...inspectionToSave, id: docRef.id, itemType: 'inspection' });
    }, [user, _runInspectionAiAnalysis]);

    const addPtw = React.useCallback(async (newPtw: Omit<Ptw, 'id' | 'referenceId'>) => {
        if(!user) throw new Error("User not authenticated");
        const referenceId = `PTW-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const ptwToSave = { ...newPtw, referenceId, userId: user.uid };
        const ptwCollection = collection(db, 'ptws');
        await addDoc(ptwCollection, ptwToSave);
    }, [user]);

    const updateObservation = React.useCallback(async (id: string, updatedData: Partial<Observation>) => {
        const observationDocRef = doc(db, 'observations', id);
        await updateDoc(observationDocRef, updatedData);
    }, []);

    const approvePtw = React.useCallback(async (id: string, signatureDataUrl: string, approver: string) => {
        const ptwDocRef = doc(db, 'ptws', id);
        await updateDoc(ptwDocRef, {
        status: 'Approved', signatureDataUrl, approver, approvedDate: new Date().toISOString(),
        });
    }, []);

    const retryAiAnalysis = React.useCallback(async (item: Observation | Inspection) => {
      if (item.itemType === 'observation') {
        const observationDocRef = doc(db, 'observations', item.id);
        await updateDoc(observationDocRef, { aiStatus: 'processing' });
        _runObservationAiAnalysis(item as Observation);
      } else if (item.itemType === 'inspection') {
        const inspectionDocRef = doc(db, 'inspections', item.id);
        await updateDoc(inspectionDocRef, { aiStatus: 'processing' });
        _runInspectionAiAnalysis(item as Inspection);
      }
    }, [_runObservationAiAnalysis, _runInspectionAiAnalysis]);

    const value = { publicItems, myItems, loading: loading || projectsLoading, addObservation, addInspection, addPtw, updateObservation, approvePtw, retryAiAnalysis };

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
