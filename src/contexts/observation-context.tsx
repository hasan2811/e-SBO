
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


export function ObservationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { projects, loading: projectsLoading } = useProjects();
    
    const [observations, setObservations] = React.useState<Observation[]>([]);
    const [inspections, setInspections] = React.useState<Inspection[]>([]);
    const [ptws, setPtws] = React.useState<Ptw[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        // Master listener that reacts to changes in authentication or project membership
        let unsubs: (() => void)[] = [];
        
        const setupListeners = () => {
          setLoading(true);

          // Clean up previous listeners before setting up new ones
          unsubs.forEach(unsub => unsub());
          unsubs = [];
          
          const userProjectIds = projects.map(p => p.id);

          const collectionsToWatch: { [key: string]: React.Dispatch<React.SetStateAction<any[]>> } = {
              observations: setObservations,
              inspections: setInspections,
              ptws: setPtws,
          };

          Object.entries(collectionsToWatch).forEach(([colName, setter]) => {
              const baseCollection = collection(db, colName);
              let masterQuery;

              // Build the query based on user status
              if (!user) {
                  // Not logged in: only see public items
                  masterQuery = query(baseCollection, where('scope', '==', 'public'));
              } else {
                  // Logged in: build a complex query
                  const conditions = [
                      where('scope', '==', 'public'),
                      where('userId', '==', user.uid)
                  ];
                  // Only add the 'in' clause if there are projects, otherwise it errors
                  if (userProjectIds.length > 0) {
                      conditions.push(where('projectId', 'in', userProjectIds));
                  }
                  masterQuery = query(baseCollection, or(...conditions));
              }

              const unsub = onSnapshot(masterQuery, (snapshot) => {
                  const items = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as any[];
                  setter(items);
              }, (err) => {
                  console.error(`Error fetching ${colName}:`, err);
                  toast({
                    variant: 'destructive',
                    title: `Failed to load ${colName}`,
                    description: err.message, // Use the actual error message
                  });
                  setter([]);
              });
              unsubs.push(unsub);
          });
          
          setLoading(false);
        }

        // We run setupListeners only when auth or project loading is complete
        if (!projectsLoading) {
            setupListeners();
        }

        return () => {
            unsubs.forEach(unsub => unsub());
        };
    // Re-run this entire effect if the user logs in/out, or their project list changes.
    }, [user, projects, projectsLoading]);

    const allItems = React.useMemo(() => {
      const combined = [
        ...observations.map(o => ({...o, itemType: 'observation' as const})),
        ...inspections.map(i => ({...i, itemType: 'inspection' as const})),
        ...ptws.map(p => ({...p, itemType: 'ptw' as const})),
      ];
      return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [observations, inspections, ptws]);

    // Refined logic to separate items based on scope and ownership
    const { publicItems, myItems } = React.useMemo(() => {
        const publicData: AllItems[] = [];
        const myData: AllItems[] = [];
        const userProjectIds = projects.map(p => p.id);

        allItems.forEach(item => {
            const isPublic = item.scope === 'public';
            const isMine = user && item.userId === user.uid;
            const isMyProject = user && item.projectId && userProjectIds.includes(item.projectId);

            if (isPublic) {
                publicData.push(item);
            }
            if (isMine || isMyProject) {
                myData.push(item);
            }
        });
        
        const myItemsUnique = Array.from(new Map(myData.map(item => [item.id, item])).values());
        
        return { publicItems: publicData, myItems: myItemsUnique };
    }, [allItems, user, projects]);

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

    const value = { allItems, publicItems, myItems, loading, addObservation, addInspection, addPtw, updateObservation, approvePtw, retryAiAnalysis };

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
