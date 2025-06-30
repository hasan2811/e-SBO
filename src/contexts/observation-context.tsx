
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
  or,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Observation, Inspection, Ptw } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useProjects } from '@/hooks/use-projects';
import {
  summarizeObservationData,
  analyzeInspectionData,
} from '@/ai/flows/summarize-observation-data';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type AllItems = ((Observation & { itemType: 'observation' }) | (Inspection & { itemType: 'inspection' }) | (Ptw & { itemType: 'ptw' }));

interface ObservationContextType {
  observations: Observation[];
  inspections: Inspection[];
  ptws: Ptw[];
  allItems: AllItems[];
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

// Helper to combine and deduplicate data arrays
function combineAndDeduplicate<T extends { id: string }>(...arrays: T[][]): T[] {
    const map = new Map<string, T>();
    arrays.forEach(arr => {
        arr.forEach(item => {
            map.set(item.id, item);
        });
    });
    return Array.from(map.values());
}


export function ObservationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { projects, loading: projectsLoading } = useProjects();
    
    // States for each data source
    const [publicObservations, setPublicObservations] = React.useState<Observation[]>([]);
    const [personalObservations, setPersonalObservations] = React.useState<Observation[]>([]);
    const [projectObservations, setProjectObservations] = React.useState<Observation[]>([]);
    
    const [publicInspections, setPublicInspections] = React.useState<Inspection[]>([]);
    const [personalInspections, setPersonalInspections] = React.useState<Inspection[]>([]);
    const [projectInspections, setProjectInspections] = React.useState<Inspection[]>([]);

    const [publicPtws, setPublicPtws] = React.useState<Ptw[]>([]);
    const [personalPtws, setPersonalPtws] = React.useState<Ptw[]>([]);
    const [projectPtws, setProjectPtws] = React.useState<Ptw[]>([]);

    const [authLoading, setAuthLoading] = React.useState(true);

    // Effect for public data
    React.useEffect(() => {
        const collections = {
            observations: setPublicObservations,
            inspections: setPublicInspections,
            ptws: setPublicPtws
        };
        const unsubs = Object.entries(collections).map(([colName, setter]) => {
            const q = query(collection(db, colName), where('scope', '==', 'public'));
            return onSnapshot(q, (snapshot) => {
                setter(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as any);
            }, (err) => console.error(`Error fetching public ${colName}:`, err));
        });
        return () => unsubs.forEach(unsub => unsub());
    }, []);

    // Effect for personal and project data
    React.useEffect(() => {
        setAuthLoading(true);
        if (!user || projectsLoading) {
            if (!user) { // Clear personal/project data if logged out
                setPersonalObservations([]); setProjectObservations([]);
                setPersonalInspections([]); setProjectInspections([]);
                setPersonalPtws([]); setProjectPtws([]);
            }
            if (!projectsLoading) setAuthLoading(false);
            return;
        }

        const projectIds = projects.map(p => p.id);
        const collections = {
            observations: { personal: setPersonalObservations, project: setProjectObservations },
            inspections: { personal: setPersonalInspections, project: setProjectInspections },
            ptws: { personal: setPersonalPtws, project: setProjectPtws }
        };

        const unsubs = Object.entries(collections).flatMap(([colName, setters]) => {
            // Personal Data Query
            const personalQuery = query(collection(db, colName), where('userId', '==', user.uid));
            const unsubPersonal = onSnapshot(personalQuery, (snapshot) => {
                setters.personal(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as any);
            }, (err) => console.error(`Error fetching personal ${colName}:`, err));

            // Project Data Query
            let unsubProject = () => {};
            if (projectIds.length > 0) {
                const projectQuery = query(collection(db, colName), where('projectId', 'in', projectIds));
                unsubProject = onSnapshot(projectQuery, (snapshot) => {
                    setters.project(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as any);
                }, (err) => console.error(`Error fetching project ${colName}:`, err));
            } else {
                 setters.project([]); // Clear project data if user has no projects
            }
            
            return [unsubPersonal, unsubProject];
        });
        
        setAuthLoading(false);
        return () => unsubs.forEach(unsub => unsub());
    }, [user, projects, projectsLoading]);
    
    // Memoize the combined data to prevent re-renders
    const observations = React.useMemo(() => combineAndDeduplicate(publicObservations, projectObservations, personalObservations), [publicObservations, projectObservations, personalObservations]);
    const inspections = React.useMemo(() => combineAndDeduplicate(publicInspections, projectInspections, personalInspections), [publicInspections, projectInspections, personalInspections]);
    const ptws = React.useMemo(() => combineAndDeduplicate(publicPtws, projectPtws, personalPtws), [publicPtws, projectPtws, personalPtws]);

    const allItems = React.useMemo(() => {
      const combined = [
        ...observations.map(o => ({...o, itemType: 'observation' as const})),
        ...inspections.map(i => ({...i, itemType: 'inspection' as const})),
        ...ptws.map(p => ({...p, itemType: 'ptw' as const})),
      ];
      return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [observations, inspections, ptws]);

    const loading = authLoading || projectsLoading;

    // AI Analysis Logic
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
    
    // Add/Update Logic
    const addObservation = React.useCallback(async (newObservation: Omit<Observation, 'id' | 'referenceId'>) => {
      if(!user) throw new Error("User not authenticated");
      const referenceId = `OBS-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const observationToSave = { ...newObservation, referenceId, aiStatus: 'processing' as const, userId: user.uid };
      const observationCollection = collection(db, 'observations');
      const docRef = await addDoc(observationCollection, observationToSave);
      _runObservationAiAnalysis({ ...observationToSave, id: docRef.id });
    }, [user, _runObservationAiAnalysis]);

    const addInspection = React.useCallback(async (newInspection: Omit<Inspection, 'id' | 'referenceId'>) => {
      if(!user) throw new Error("User not authenticated");
      const referenceId = `INSP-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const inspectionToSave = { ...newInspection, referenceId, aiStatus: 'processing' as const, userId: user.uid };
      const inspectionCollection = collection(db, 'inspections');
      const docRef = await addDoc(inspectionCollection, inspectionToSave);
      _runInspectionAiAnalysis({ ...inspectionToSave, id: docRef.id });
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
      if ('riskLevel' in item) {
        const observationDocRef = doc(db, 'observations', item.id);
        await updateDoc(observationDocRef, { aiStatus: 'processing' });
        _runObservationAiAnalysis(item as Observation);
      } else if ('equipmentName' in item) {
        const inspectionDocRef = doc(db, 'inspections', item.id);
        await updateDoc(inspectionDocRef, { aiStatus: 'processing' });
        _runInspectionAiAnalysis(item as Inspection);
      }
    }, [_runObservationAiAnalysis, _runInspectionAiAnalysis]);

    const value = { allItems, observations, inspections, ptws, loading, addObservation, addInspection, addPtw, updateObservation, approvePtw, retryAiAnalysis };

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
