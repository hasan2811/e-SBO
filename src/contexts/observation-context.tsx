
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
  retryAiAnalysis: (item: Observation | Inspection) => Promise<void>;
}

const ObservationContext = React.createContext<
  ObservationContextType | undefined
>(undefined);

export function ObservationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [loading, setLoading] = React.useState(true);

    // Separate states for each data stream to prevent race conditions
    const [privateObservations, setPrivateObservations] = React.useState<Observation[]>([]);
    const [privateInspections, setPrivateInspections] = React.useState<Inspection[]>([]);
    const [privatePtws, setPrivatePtws] = React.useState<Ptw[]>([]);
    const [publicObservations, setPublicObservations] = React.useState<Observation[]>([]);
    const [publicInspections, setPublicInspections] = React.useState<Inspection[]>([]);
    const [publicPtws, setPublicPtws] = React.useState<Ptw[]>([]);

    // Memoize the combined and deduplicated data lists
    const observations = React.useMemo(() => {
        const all = new Map<string, Observation>();
        publicObservations.forEach(o => all.set(o.id, o));
        privateObservations.forEach(o => all.set(o.id, o)); // Overwrites public if user is owner
        return Array.from(all.values());
    }, [publicObservations, privateObservations]);

    const inspections = React.useMemo(() => {
        const all = new Map<string, Inspection>();
        publicInspections.forEach(i => all.set(i.id, i));
        privateInspections.forEach(i => all.set(i.id, i));
        return Array.from(all.values());
    }, [publicInspections, privateInspections]);
    
    const ptws = React.useMemo(() => {
        const all = new Map<string, Ptw>();
        publicPtws.forEach(p => all.set(p.id, p));
        privatePtws.forEach(p => all.set(p.id, p));
        return Array.from(all.values());
    }, [publicPtws, privatePtws]);

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
            // Clear private data on logout
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
                if (++loadedCount === collections.length) setLoading(false);
            }, (error) => {
                console.error(`Error fetching public ${name}:`, error);
                if (++loadedCount === collections.length) setLoading(false);
            });
            return unsub;
        });

        return () => unsubs.forEach(unsub => unsub());
    }, []);

    const allItems = React.useMemo(() => {
      const combined = [
        ...observations.map(o => ({...o, itemType: 'observation' as const})),
        ...inspections.map(i => ({...i, itemType: 'inspection' as const})),
        ...ptws.map(p => ({...p, itemType: 'ptw' as const})),
      ];
      return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [observations, inspections, ptws]);

    // AI Analysis Logic RESTORED
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
      // Run AI analysis on the newly created document
      _runObservationAiAnalysis({ ...observationToSave, id: docRef.id });
    }, [user, _runObservationAiAnalysis]);

    const addInspection = React.useCallback(async (newInspection: Omit<Inspection, 'id' | 'referenceId'>) => {
      if(!user) throw new Error("User not authenticated");
      const referenceId = `INSP-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const inspectionToSave = { ...newInspection, referenceId, aiStatus: 'processing' as const, userId: user.uid };
      const inspectionCollection = collection(db, 'inspections');
      const docRef = await addDoc(inspectionCollection, inspectionToSave);
      // Run AI analysis on the newly created document
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
      if ('riskLevel' in item) { // It's an Observation
        const observationDocRef = doc(db, 'observations', item.id);
        await updateDoc(observationDocRef, { aiStatus: 'processing' });
        _runObservationAiAnalysis(item as Observation);
      } else if ('equipmentName' in item) { // It's an Inspection
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
