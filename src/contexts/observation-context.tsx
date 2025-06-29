
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

// Helper function to combine and de-duplicate data from two sources
function combineAndSort<T extends { id: string; date: string }>(
  dataA: T[],
  dataB: T[]
): T[] {
  const combined = new Map<string, T>();
  dataA.forEach(item => combined.set(item.id, item));
  dataB.forEach(item => combined.set(item.id, item));
  return Array.from(combined.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}


export function ObservationProvider({ children }: { children: React.ReactNode }) {
  // Separate states for each data source to prevent race conditions
  const [publicObservations, setPublicObservations] = React.useState<Observation[]>([]);
  const [privateObservations, setPrivateObservations] = React.useState<Observation[]>([]);
  const [publicInspections, setPublicInspections] = React.useState<Inspection[]>([]);
  const [privateInspections, setPrivateInspections] = React.useState<Inspection[]>([]);
  const [publicPtws, setPublicPtws] = React.useState<Ptw[]>([]);
  const [privatePtws, setPrivatePtws] = React.useState<Ptw[]>([]);
  
  const [loading, setLoading] = React.useState<boolean>(true);
  const { user } = useAuth();

  // Effect for setting up Firestore listeners
  React.useEffect(() => {
    if (user) {
      setLoading(true);

      const createListener = <T extends {id: string}>(
        collectionPath: string,
        setData: React.Dispatch<React.SetStateAction<T[]>>,
        isPublic: boolean
      ) => {
        let q: Query<DocumentData>;
        const collectionRef = collection(db, collectionPath);
        if (isPublic) {
          q = query(collectionRef, where('scope', '==', 'public'), orderBy('date', 'desc'));
        } else {
          q = query(collectionRef, where('userId', '==', user.uid), orderBy('date', 'desc'));
        }
        
        return onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
          setData(data);
          if (isPublic) setLoading(false); // Consider loading finished after first public data arrives
        }, (error) => {
          console.error(`Error fetching ${isPublic ? 'public' : 'private'} ${collectionPath}:`, error);
          toast({ variant: 'destructive', title: 'Data Fetch Error', description: `Could not fetch ${collectionPath}.` });
          if (isPublic) setLoading(false);
        });
      };

      const unsubObsPublic = createListener('observations', setPublicObservations, true);
      const unsubObsPrivate = createListener('observations', setPrivateObservations, false);
      const unsubInspPublic = createListener('inspections', setPublicInspections, true);
      const unsubInspPrivate = createListener('inspections', setPrivateInspections, false);
      const unsubPtwPublic = createListener('ptws', setPublicPtws, true);
      const unsubPtwPrivate = createListener('ptws', setPrivatePtws, false);

      return () => {
        unsubObsPublic();
        unsubObsPrivate();
        unsubInspPublic();
        unsubInspPrivate();
        unsubPtwPublic();
        unsubPtwPrivate();
      };
    } else {
      // Clear all data if user logs out
      setPublicObservations([]);
      setPrivateObservations([]);
      setPublicInspections([]);
      setPrivateInspections([]);
      setPublicPtws([]);
      setPrivatePtws([]);
      setLoading(false);
    }
  }, [user]);
  
  // Combine states with useMemo for performance and consistency
  const observations = React.useMemo(() => combineAndSort(publicObservations, privateObservations), [publicObservations, privateObservations]);
  const inspections = React.useMemo(() => combineAndSort(publicInspections, privateInspections), [publicInspections, privateInspections]);
  const ptws = React.useMemo(() => combineAndSort(publicPtws, privatePtws), [publicPtws, privatePtws]);


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
