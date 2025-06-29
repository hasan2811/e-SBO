
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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Observation, Inspection, Ptw } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
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
  retryAiAnalysis: (observation: Observation) => Promise<void>;
}

const ObservationContext = React.createContext<
  ObservationContextType | undefined
>(undefined);

export function ObservationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [loading, setLoading] = React.useState(true);

    // States for private (user-specific) data
    const [privateObservations, setPrivateObservations] = React.useState<Observation[]>([]);
    const [privateInspections, setPrivateInspections] = React.useState<Inspection[]>([]);
    const [privatePtws, setPrivatePtws] = React.useState<Ptw[]>([]);

    // States for public data
    const [publicObservations, setPublicObservations] = React.useState<Observation[]>([]);
    const [publicInspections, setPublicInspections] = React.useState<Inspection[]>([]);
    const [publicPtws, setPublicPtws] = React.useState<Ptw[]>([]);

    // Effect for fetching user's private data
    React.useEffect(() => {
        if (user) {
            const unsubs: (() => void)[] = [];
            const collections = [
                { name: 'observations', setter: setPrivateObservations },
                { name: 'inspections', setter: setPrivateInspections },
                { name: 'ptws', setter: setPrivatePtws },
            ];
            collections.forEach(({ name, setter }) => {
                const q = query(collection(db, name), where('userId', '==', user.uid));
                const unsub = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as any[];
                    setter(data);
                }, (error) => console.error(`Error fetching private ${name}:`, error));
                unsubs.push(unsub);
            });
            return () => unsubs.forEach(unsub => unsub());
        } else {
            setPrivateObservations([]);
            setPrivateInspections([]);
            setPrivatePtws([]);
        }
    }, [user]);
    
    // Effect for fetching public data
    React.useEffect(() => {
        setLoading(true);
        const collections = [
            { name: 'observations', setter: setPublicObservations },
            { name: 'inspections', setter: setPublicInspections },
            { name: 'ptws', setter: setPublicPtws },
        ];
        
        let loadedCount = 0;
        const unsubs = collections.map(({ name, setter }) => {
            const q = query(collection(db, name), where('scope', '==', 'public'));
            const unsub = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as any[];
                setter(data);
                loadedCount++;
                if (loadedCount === collections.length) {
                    setLoading(false);
                }
            }, (error) => {
                console.error(`Error fetching public ${name}:`, error)
                loadedCount++;
                if (loadedCount === collections.length) {
                    setLoading(false);
                }
            });
            return unsub;
        });

        return () => unsubs.forEach(unsub => unsub());
    }, []);


    const allItems = React.useMemo(() => {
        const combinedMap = new Map<string, AllItems>();

        const addItemsToMap = (items: any[], itemType: 'observation' | 'inspection' | 'ptw') => {
            items.forEach(item => combinedMap.set(item.id, { ...item, itemType }));
        };

        addItemsToMap(publicObservations, 'observation');
        addItemsToMap(publicInspections, 'inspection');
        addItemsToMap(publicPtws, 'ptw');
        // Add private items last to ensure they overwrite public ones if IDs are duplicated (for the owner)
        addItemsToMap(privateObservations, 'observation');
        addItemsToMap(privateInspections, 'inspection');
        addItemsToMap(privatePtws, 'ptw');

        return Array.from(combinedMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [publicObservations, publicInspections, publicPtws, privateObservations, privateInspections, privatePtws]);

    const observations = React.useMemo(() => allItems.filter((i): i is Observation & { itemType: 'observation' } => i.itemType === 'observation'), [allItems]);
    const inspections = React.useMemo(() => allItems.filter((i): i is Inspection & { itemType: 'inspection' } => i.itemType === 'inspection'), [allItems]);
    const ptws = React.useMemo(() => allItems.filter((i): i is Ptw & { itemType: 'ptw' } => i.itemType === 'ptw'), [allItems]);
    
    // AI Analysis Logic
    const _runObservationAiAnalysis = React.useCallback((observation: Observation) => {
      const observationDocRef = doc(db, 'observations', observation.id);
      const observationData = `
        Location: ${observation.location}
        Company: ${observation.company}
        Category: ${observation.category}
        Status: ${observation.status}
        Risk Level: ${observation.riskLevel}
        Submitted By: ${observation.submittedBy}
        Date: ${new Date(observation.date).toLocaleString()}
        Findings: ${observation.findings}
        Recommendation: ${observation.recommendation}
      `;

      summarizeObservationData({ observationData })
        .then(summary => {
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
          updateDoc(observationDocRef, aiData);
        })
        .catch(error => {
          console.error("Failed to generate AI summary for observation:", error);
          updateDoc(observationDocRef, { aiStatus: 'failed' });
          toast({ variant: 'destructive', title: 'Observation AI Failed', description: 'Could not generate AI analysis.'});
        });
    }, []);

    const _runInspectionAiAnalysis = React.useCallback((inspection: Inspection) => {
      const inspectionDocRef = doc(db, 'inspections', inspection.id);

      const inspectionData = `
        Equipment Name: ${inspection.equipmentName}
        Equipment Type: ${inspection.equipmentType}
        Location: ${inspection.location}
        Status: ${inspection.status}
        Submitted By: ${inspection.submittedBy}
        Date: ${new Date(inspection.date).toLocaleString()}
        Findings: ${inspection.findings}
        Recommendation: ${inspection.recommendation || 'N/A'}
      `;

      analyzeInspectionData({ inspectionData })
        .then(analysis => {
          const aiData = {
              aiSummary: analysis.summary,
              aiRisks: analysis.risks,
              aiSuggestedActions: analysis.suggestedActions,
              aiStatus: 'completed' as const,
          };
          updateDoc(inspectionDocRef, aiData);
        })
        .catch(error => {
          console.error("Failed to generate AI analysis for inspection:", error);
          updateDoc(inspectionDocRef, { aiStatus: 'failed' });
          toast({ variant: 'destructive', title: 'Inspection AI Failed', description: 'Could not generate AI analysis.'});
        });
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

    const retryAiAnalysis = React.useCallback(async (observation: Observation) => {
        const observationDocRef = doc(db, 'observations', observation.id);
        await updateDoc(observationDocRef, { aiStatus: 'processing' });
        _runObservationAiAnalysis(observation);
    }, [_runObservationAiAnalysis]);

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
