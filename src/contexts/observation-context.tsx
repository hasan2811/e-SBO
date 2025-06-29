
'use client';

import * as React from 'react';
import { collection, doc, onSnapshot, query, updateDoc, orderBy, addDoc, where, Query, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Observation, Inspection, Ptw } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { summarizeObservationData, analyzeInspectionData } from '@/ai/flows/summarize-observation-data';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type AllItems = ((Observation & { itemType: 'observation' }) | (Inspection & { itemType: 'inspection' }) | (Ptw & { itemType: 'ptw' }));

interface ObservationContextType {
  observations: Observation[];
  inspections: Inspection[];
  ptws: Ptw[];
  allItems: AllItems[];
  loading: boolean;
  addObservation: (observation: Omit<Observation, 'id' | 'referenceId'>) => Promise<void>;
  addInspection: (inspection: Omit<Inspection, 'id' | 'referenceId'>) => Promise<void>;
  addPtw: (ptw: Omit<Ptw, 'id' | 'referenceId'>) => Promise<void>;
  updateObservation: (id: string, updatedData: Partial<Observation>) => Promise<void>;
  approvePtw: (id: string, signatureDataUrl: string, approver: string) => Promise<void>;
  retryAiAnalysis: (observation: Observation) => Promise<void>;
}

const ObservationContext = React.createContext<ObservationContextType | undefined>(undefined);


export function ObservationProvider({ children }: { children: React.ReactNode }) {
  const [publicObservations, setPublicObservations] = React.useState<Observation[]>([]);
  const [privateObservations, setPrivateObservations] = React.useState<Observation[]>([]);
  const [publicInspections, setPublicInspections] = React.useState<Inspection[]>([]);
  const [privateInspections, setPrivateInspections] = React.useState<Inspection[]>([]);
  const [publicPtws, setPublicPtws] = React.useState<Ptw[]>([]);
  const [privatePtws, setPrivatePtws] = React.useState<Ptw[]>([]);
  
  const [loading, setLoading] = React.useState<boolean>(true);
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      setLoading(true);
      
      const createListener = <T extends {id: string}>(
        collectionPath: string,
        setData: React.Dispatch<React.SetStateAction<T[]>>,
        scope: 'public' | 'private'
      ) => {
        let q: Query<DocumentData>;
        const collectionRef = collection(db, collectionPath);
        
        if (scope === 'public') {
          q = query(collectionRef, where('scope', '==', 'public'), orderBy('date', 'desc'));
        } else { // 'private'
          q = query(collectionRef, where('userId', '==', user.uid), where('scope', '==', 'private'), orderBy('date', 'desc'));
        }
        
        return onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
          setData(data);
        }, (error) => {
          console.error(`Error fetching ${scope} ${collectionPath}: `, error);
          toast({ variant: 'destructive', title: `Error Fetching ${collectionPath}`, description: error.message });
        });
      };

      const unsubscribers = [
        createListener('observations', setPublicObservations, 'public'),
        createListener('observations', setPrivateObservations, 'private'),
        createListener('inspections', setPublicInspections, 'public'),
        createListener('inspections', setPrivateInspections, 'private'),
        createListener('ptws', setPublicPtws, 'public'),
        createListener('ptws', setPrivatePtws, 'private'),
      ];
      
      setLoading(false);

      return () => unsubscribers.forEach(unsub => unsub());
    } else {
      setPublicObservations([]);
      setPrivateObservations([]);
      setPublicInspections([]);
      setPrivateInspections([]);
      setPublicPtws([]);
      setPrivatePtws([]);
      setLoading(false);
    }
  }, [user]);
  
  const observations = React.useMemo(() => [...publicObservations, ...privateObservations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [publicObservations, privateObservations]);
  const inspections = React.useMemo(() => [...publicInspections, ...privateInspections].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [publicInspections, privateInspections]);
  const ptws = React.useMemo(() => [...publicPtws, ...privatePtws].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [publicPtws, privatePtws]);

  const allItems = React.useMemo(() => {
    const typedObservations = observations.map(o => ({ ...o, itemType: 'observation' as const }));
    const typedInspections = inspections.map(i => ({ ...i, itemType: 'inspection' as const }));
    const typedPtws = ptws.map(p => ({ ...p, itemType: 'ptw' as const }));
    
    return [...typedObservations, ...typedInspections, ...typedPtws]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [observations, inspections, ptws]);


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
      referenceId,
      aiStatus: 'processing' as const,
    };
    const inspectionCollection = collection(db, 'inspections');
    const docRef = await addDoc(inspectionCollection, inspectionToSave);
    _runInspectionAiAnalysis({ ...inspectionToSave, id: docRef.id });
  };

  const addPtw = async (newPtw: Omit<Ptw, 'id' | 'referenceId'>) => {
    const referenceId = `PTW-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const ptwToSave = { ...newPtw, referenceId };
    const ptwCollection = collection(db, 'ptws');
    await addDoc(ptwCollection, ptwToSave);
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
