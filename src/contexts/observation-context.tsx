
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
  const [observations, setObservations] = React.useState<Observation[]>([]);
  const [inspections, setInspections] = React.useState<Inspection[]>([]);
  const [ptws, setPtws] = React.useState<Ptw[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      setLoading(true);

      const collectionsToWatch = ['observations', 'inspections', 'ptws'];
      const totalListeners = collectionsToWatch.length * 2; // public + user for each
      let loadedListeners = 0;

      const unsubscribers: (() => void)[] = [];

      const checkAllLoaded = () => {
        loadedListeners++;
        if (loadedListeners >= totalListeners) {
          setLoading(false);
        }
      };
      
      const setupCollectionListeners = <T extends { id: string }>(
        path: 'observations' | 'inspections' | 'ptws',
        setData: React.Dispatch<React.SetStateAction<T[]>>
      ) => {
        const userDocs: Record<string, T> = {};
        const publicDocs: Record<string, T> = {};

        const mergeAndSetData = () => {
          const combined = { ...publicDocs, ...userDocs }; // userDocs will overwrite publicDocs for same ID, which is fine.
          const sortedData = Object.values(combined).sort((a, b) => 
              new Date((b as any).date).getTime() - new Date((a as any).date).getTime()
          );
          setData(sortedData);
        };

        // Listener for user's own documents (private and public)
        const userQuery = query(collection(db, path), where('userId', '==', user.uid));
        const unsubUser = onSnapshot(userQuery, (snapshot) => {
          snapshot.docs.forEach(doc => { userDocs[doc.id] = { ...doc.data(), id: doc.id } as T; });
          if(snapshot.metadata.fromCache && snapshot.docs.length === 0) {} // Don't false-fire on initial cache read
          else {
            mergeAndSetData();
            checkAllLoaded();
          }
        }, (error) => {
          console.error(`Error fetching user ${path}:`, error);
          checkAllLoaded();
        });

        // Listener for all public documents
        const publicQuery = query(collection(db, path), where('scope', '==', 'public'));
        const unsubPublic = onSnapshot(publicQuery, (snapshot) => {
          snapshot.docs.forEach(doc => { publicDocs[doc.id] = { ...doc.data(), id: doc.id } as T; });
          if(snapshot.metadata.fromCache && snapshot.docs.length === 0) {}
          else {
            mergeAndSetData();
            checkAllLoaded();
          }
        }, (error) => {
          console.error(`Error fetching public ${path}:`, error);
          checkAllLoaded();
        });
        
        unsubscribers.push(unsubUser, unsubPublic);
      };

      setupCollectionListeners('observations', setObservations);
      setupCollectionListeners('inspections', setInspections);
      setupCollectionListeners('ptws', setPtws);
      
      return () => unsubscribers.forEach(unsub => unsub());

    } else {
      setObservations([]);
      setInspections([]);
      setPtws([]);
      setLoading(false);
    }
  }, [user]);

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
