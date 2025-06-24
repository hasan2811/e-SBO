'use client';

import * as React from 'react';
import type { Observation } from '@/lib/types';

interface ObservationContextType {
  observations: Observation[];
  addObservation: (observation: Observation) => void;
  updateObservation: (id: string, updatedData: Partial<Observation>) => void;
}

const ObservationContext = React.createContext<ObservationContextType | undefined>(undefined);

export function ObservationProvider({ children }: { children: React.ReactNode }) {
  const [observations, setObservations] = React.useState<Observation[]>([]);

  const addObservation = (newObservation: Observation) => {
    setObservations(prev => [newObservation, ...prev]);
  };

  const updateObservation = (id: string, updatedData: Partial<Observation>) => {
    setObservations(prev =>
      prev.map(obs => (obs.id === id ? { ...obs, ...updatedData } : obs))
    );
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
