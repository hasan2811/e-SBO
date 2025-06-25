'use client';

import * as React from 'react';
import { collection, doc, onSnapshot, query, setDoc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Observation } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

interface ObservationContextType {
  observations: Observation[];
  addObservation: (observation: Observation) => Promise<void>;
  updateObservation: (id: string, updatedData: Partial<Observation>) => Promise<void>;
}

const ObservationContext = React.createContext<ObservationContextType | undefined>(undefined);

export function ObservationProvider({ children }: { children: React.ReactNode }) {
  const [observations, setObservations] = React.useState<Observation[]>([]);
  const { user } = useAuth();

  React.useEffect(() => {
    // Only fetch data if the user is logged in
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
      });

      // Cleanup subscription on component unmount or when user logs out
      return () => unsubscribe();
    } else {
      // If user is not logged in, clear any existing observations
      setObservations([]);
    }
  }, [user]); // Rerun the effect when the user's auth state changes


  const addObservation = async (newObservation: Observation) => {
    try {
      // Use the custom ID from the observation object as the document ID
      const observationDocRef = doc(db, 'observations', newObservation.id);
      await setDoc(observationDocRef, newObservation);
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
