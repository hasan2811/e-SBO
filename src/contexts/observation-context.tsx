
'use client';

import * as React from 'react';
import { collection, doc, onSnapshot, query, setDoc, updateDoc, orderBy, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Observation } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { getAiSummary } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ObservationContextType {
  observations: Observation[];
  addObservation: (observation: Omit<Observation, 'id' | 'referenceId'>) => Promise<void>;
  updateObservation: (id: string, updatedData: Partial<Observation>) => Promise<void>;
}

const ObservationContext = React.createContext<ObservationContextType | undefined>(undefined);

export function ObservationProvider({ children }: { children: React.ReactNode }) {
  const [observations, setObservations] = React.useState<Observation[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  React.useEffect(() => {
    if (user) {
      const observationCollection = collection(db, 'observations');
      const q = query(observationCollection, orderBy('date', 'desc'));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const obsData = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        } as Observation));
        setObservations(obsData);
      }, (error) => {
        console.error("Error fetching observations from Firestore: ", error);
         toast({
          variant: 'destructive',
          title: 'Error Fetching Data',
          description: 'Could not fetch observations from the database.',
        });
      });

      return () => unsubscribe();
    } else {
      setObservations([]);
    }
  }, [user, toast]);


  const addObservation = async (newObservation: Omit<Observation, 'id' | 'referenceId'>) => {
    try {
      // Generate a professional, user-friendly reference ID
      const referenceId = `OBS-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      const observationToSave = { ...newObservation, referenceId };

      // Use addDoc to let Firestore generate the ID.
      const observationCollection = collection(db, 'observations');
      const observationDocRef = await addDoc(observationCollection, observationToSave);

      // Asynchronously get AI summary and update the document.
      // This runs in the background and does not block the UI.
      const fullObservationData = { ...observationToSave, id: observationDocRef.id };
      
      getAiSummary(fullObservationData)
        .then(summary => {
          if (summary) {
            const aiData = {
              aiSummary: summary.summary,
              aiRisks: summary.risks,
              aiSuggestedActions: summary.suggestedActions,
            };
            // Update the same doc with the AI data.
            updateDoc(observationDocRef, aiData);
          }
        })
        .catch(error => {
          // Log the error but don't bother the user. The main observation is saved.
          console.error("Failed to generate or save AI summary:", error);
        });

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

  const value = { observations, addObservation, updateObservation };

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
