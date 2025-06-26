'use client';

import * as React from 'react';
import { collection, doc, onSnapshot, query, updateDoc, orderBy, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Observation } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { getAiSummary } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ObservationContextType {
  observations: Observation[];
  loading: boolean;
  addObservation: (observation: Omit<Observation, 'id' | 'referenceId'>) => Promise<void>;
  updateObservation: (id: string, updatedData: Partial<Observation>) => Promise<void>;
  retryAiAnalysis: (observation: Observation) => Promise<void>;
}

const ObservationContext = React.createContext<ObservationContextType | undefined>(undefined);

export function ObservationProvider({ children }: { children: React.ReactNode }) {
  const [observations, setObservations] = React.useState<Observation[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const { user } = useAuth();
  const { toast } = useToast();

  React.useEffect(() => {
    if (user) {
      setLoading(true);
      const observationCollection = collection(db, 'observations');
      const q = query(observationCollection, orderBy('date', 'desc'));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const obsData = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        } as Observation));
        setObservations(obsData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching observations from Firestore: ", error);
         toast({
          variant: 'destructive',
          title: 'Error Fetching Data',
          description: 'Could not fetch observations from the database.',
        });
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setObservations([]);
      setLoading(false);
    }
  }, [user, toast]);

  const _runAiAnalysis = (observation: Observation) => {
    const observationDocRef = doc(db, 'observations', observation.id);
    getAiSummary(observation)
      .then(summary => {
        if (summary) {
          const aiData = {
            aiSummary: summary.summary,
            aiRisks: summary.risks,
            aiSuggestedActions: summary.suggestedActions,
            aiRelevantRegulations: summary.relevantRegulations,
            aiStatus: 'completed' as const,
          };
          updateDoc(observationDocRef, aiData);
        } else {
           updateDoc(observationDocRef, { aiStatus: 'failed' });
        }
      })
      .catch(error => {
        console.error("Failed to generate or save AI summary:", error);
        updateDoc(observationDocRef, { aiStatus: 'failed' });
        toast({
          variant: 'destructive',
          title: 'AI Analysis Failed',
          description: 'Could not generate AI analysis. Please try again.',
        });
      });
  };

  const retryAiAnalysis = async (observation: Observation) => {
    const observationDocRef = doc(db, 'observations', observation.id);
    await updateDoc(observationDocRef, { aiStatus: 'processing' });
    _runAiAnalysis(observation);
  };

  const addObservation = async (newObservation: Omit<Observation, 'id' | 'referenceId'>) => {
    try {
      const referenceId = `OBS-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      const observationToSave = { ...newObservation, referenceId, aiStatus: 'processing' as const };

      const observationCollection = collection(db, 'observations');
      const observationDocRef = await addDoc(observationCollection, observationToSave);

      const fullObservationData = { ...observationToSave, id: observationDocRef.id };
      _runAiAnalysis(fullObservationData);

    } catch (error) {
      console.error("Error adding document to Firestore: ", error);
      throw error;
    }
  };

  const updateObservation = async (id: string, updatedData: Partial<Observation>) => {
    try {
      const observationDocRef = doc(db, 'observations', id);
      await updateDoc(observationDocRef, updatedData);
    } catch (error) {
      console.error("Error updating document in Firestore: ", error);
      throw error;
    }
  };

  const value = { observations, loading, addObservation, updateObservation, retryAiAnalysis };

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
