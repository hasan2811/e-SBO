
'use client';

import * as React from 'react';
import { collection, doc, onSnapshot, query, updateDoc, orderBy, addDoc, where, Query, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Observation, Inspection, Ptw } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { summarizeObservationData, analyzeInspectionData } from '@/ai/flows/summarize-observation-data';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ObservationContextType {
  observations: Observation[];
  inspections: Inspection[];
  ptws: Ptw[];
  loading: boolean;
  addObservation: (observation: Omit<Observation, 'id' | 'referenceId'>) => Promise<void>;
  addInspection: (inspection: Omit<Inspection, 'id' | 'referenceId'>) => Promise<void>;
  addPtw: (ptw: Omit<Ptw, 'id' | 'referenceId'>) => Promise<void>;
  updateObservation: (id: string, updatedData: Partial<Observation>) => Promise<void>;
  approvePtw: (id: string, signatureDataUrl: string, approver: string) => Promise<void>;
  retryAiAnalysis: (observation: Observation) => Promise<void>;
}

const ObservationContext = React.createContext<ObservationContextType | undefined>(undefined);

// Helper function to manage combined data from public and private snapshots
function combineSnapshots<T extends { id: string }>(
  publicData: T[],
  privateData: T[]
): T[] {
  const combined = new Map<string, T>();
  publicData.forEach(item => combined.set(item.id, item));
  privateData.forEach(item => combined.set(item.id, item));
  return Array.from(combined.values());
}


export function ObservationProvider({ children }: { children: React.ReactNode }) {
  const [observations, setObservations] = React.useState<Observation[]>([]);
  const [inspections, setInspections] = React.useState<Inspection[]>([]);
  const [ptws, setPtws] = React.useState<Ptw[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      setLoading(true);
      
      const collections = {
        observations: collection(db, 'observations'),
        inspections: collection(db, 'inspections'),
        ptws: collection(db, 'ptws'),
      };

      // --- Setting up dual listeners for each collection ---
      let publicObservations: Observation[] = [], privateObservations: Observation[] = [];
      let publicInspections: Inspection[] = [], privateInspections: Inspection[] = [];
      let publicPtws: Ptw[] = [], privatePtws: Ptw[] = [];

      const createListeners = <T extends {id: string}>(
        collectionRef: Query<DocumentData>,
        setData: React.Dispatch<React.SetStateAction<T[]>>,
        publicStore: {current: T[]},
        privateStore: {current: T[]}
      ) => {
        const publicQuery = query(collectionRef, where('scope', '==', 'public'), orderBy('date', 'desc'));
        const privateQuery = query(collectionRef, where('userId', '==', user.uid), orderBy('date', 'desc'));

        const unsubPublic = onSnapshot(publicQuery, (snapshot) => {
          publicStore.current = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
          setData(combineSnapshots(publicStore.current, privateStore.current) as T[]);
          setLoading(false); // Stop loading after first data fetch
        }, (error) => {
          console.error(`Error fetching public data for ${collectionRef.path}:`, error);
          toast({ variant: 'destructive', title: 'Data Fetch Error', description: `Could not fetch public ${collectionRef.path}.` });
          setLoading(false);
        });

        const unsubPrivate = onSnapshot(privateQuery, (snapshot) => {
          privateStore.current = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
          setData(combineSnapshots(publicStore.current, privateStore.current) as T[]);
        }, (error) => {
          console.error(`Error fetching private data for ${collectionRef.path}:`, error);
          toast({ variant: 'destructive', title: 'Data Fetch Error', description: `Could not fetch your private ${collectionRef.path}.` });
        });

        return [unsubPublic, unsubPrivate];
      }
      
      const publicObsRef = React.useRef<Observation[]>([]);
      const privateObsRef = React.useRef<Observation[]>([]);
      const [unsubObsPublic, unsubObsPrivate] = createListeners(collections.observations, setObservations, publicObsRef, privateObsRef);

      const publicInspRef = React.useRef<Inspection[]>([]);
      const privateInspRef = React.useRef<Inspection[]>([]);
      const [unsubInspPublic, unsubInspPrivate] = createListeners(collections.inspections, setInspections, publicInspRef, privateInspRef);
      
      const publicPtwRef = React.useRef<Ptw[]>([]);
      const privatePtwRef = React.useRef<Ptw[]>([]);
      const [unsubPtwPublic, unsubPtwPrivate] = createListeners(collections.ptws, setPtws, publicPtwRef, privatePtwRef);

      return () => {
        unsubObsPublic();
        unsubObsPrivate();
        unsubInspPublic();
        unsubInspPrivate();
        unsubPtwPublic();
        unsubPtwPrivate();
      };
    } else {
      setObservations([]);
      setInspections([]);
      setPtws([]);
      setLoading(false);
    }
  }, [user]);

  const _runObservationAiAnalysis = (observation: Observation) => {
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
          ...summary,
          aiStatus: 'completed' as const,
        };
        updateDoc(observationDocRef, aiData);
      })
      .catch(error => {
        console.error("Failed to generate AI summary for observation:", error);
        updateDoc(observationDocRef, { aiStatus: 'failed' });
        toast({ variant: 'destructive', title: 'Observation AI Failed', description: 'Could not generate AI analysis.'});
      });
  };

  const _runInspectionAiAnalysis = (inspection: Inspection) => {
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
  };

  const retryAiAnalysis = async (observation: Observation) => {
    const observationDocRef = doc(db, 'observations', observation.id);
    await updateDoc(observationDocRef, { aiStatus: 'processing' });
    _runObservationAiAnalysis(observation);
  };

  const addObservation = async (newObservation: Omit<Observation, 'id' | 'referenceId'>) => {
    const referenceId = `OBS-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const observationToSave = { 
      ...newObservation,
      scope: newObservation.scope || 'public',
      referenceId,
      aiStatus: 'processing' as const
    };
    const observationCollection = collection(db, 'observations');
    const docRef = await addDoc(observationCollection, observationToSave);
    _runObservationAiAnalysis({ ...observationToSave, id: docRef.id });
  };

  const addInspection = async (newInspection: Omit<Inspection, 'id' | 'referenceId'>) => {
    const referenceId = `INSP-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const inspectionToSave = {
      ...newInspection,
      scope: newInspection.scope || 'public',
      referenceId,
      aiStatus: 'processing' as const,
    };
    const inspectionCollection = collection(db, 'inspections');
    const docRef = await addDoc(inspectionCollection, inspectionToSave);
    _runInspectionAiAnalysis({ ...inspectionToSave, id: docRef.id });
  };

  const addPtw = async (newPtw: Omit<Ptw, 'id' | 'referenceId'>) => {
    const referenceId = `PTW-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const ptwToSave = { ...newPtw, referenceId, scope: newPtw.scope || 'public' };
    const ptwCollection = collection(db, 'ptws');
    await addDoc(ptwCollection, ptwToSave);
    // AI analysis for PTW can be added here in the future
  };

  const updateObservation = async (id: string, updatedData: Partial<Observation>) => {
    const observationDocRef = doc(db, 'observations', id);
    await updateDoc(observationDocRef, updatedData);
  };

  const approvePtw = async (id: string, signatureDataUrl: string, approver: string) => {
    const ptwDocRef = doc(db, 'ptws', id);
    await updateDoc(ptwDocRef, {
      status: 'Approved',
      signatureDataUrl,
      approver,
      approvedDate: new Date().toISOString(),
    });
  };

  const value = { observations, inspections, ptws, loading, addObservation, addInspection, addPtw, updateObservation, approvePtw, retryAiAnalysis };

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
