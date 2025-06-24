'use client';

import * as React from 'react';
import type { Observation } from '@/lib/types';
import { subDays } from 'date-fns';

const initialObservations: Observation[] = [
    {
      id: 'OBS-5281',
      location: 'Location A',
      submittedBy: 'Budi Cahyono',
      date: subDays(new Date(), 2).toISOString(),
      findings: 'Minor water leak from ceiling pipe in the main corridor. No immediate structural damage observed.',
      recommendation: 'Seal the pipe joint and monitor for further leakage. Schedule a full check-up within the month.',
      riskLevel: 'Low',
      status: 'Pending',
      category: 'Plumbing',
      company: 'Perusahaan A',
      photoUrl: 'https://placehold.co/600x400.png',
    },
    {
      id: 'OBS-9374',
      location: 'Location B',
      submittedBy: 'Siti Aminah',
      date: subDays(new Date(), 15).toISOString(),
      findings: 'Several electrical outlets are not working in the west wing. Breaker trips frequently.',
      recommendation: 'Immediate inspection by a certified electrician is required. Do not use affected outlets.',
      riskLevel: 'High',
      status: 'In Progress',
      category: 'Electrical',
      company: 'Perusahaan B',
    },
    {
      id: 'OBS-1029',
      location: 'Location C',
      submittedBy: 'Agus Santoso',
      date: subDays(new Date(), 35).toISOString(),
      findings: 'Cracks found on the support beam on the 3rd floor. Requires structural assessment.',
      recommendation: 'Action has been taken. The beam was reinforced and certified by an engineer.',
      riskLevel: 'Critical',
      status: 'Completed',
      category: 'Structural',
      company: 'Perusahaan C',
      actionTakenDescription: 'Support beam was reinforced with steel plates and concrete filling. Certified safe.',
    },
    {
      id: 'OBS-4826',
      location: 'Location A',
      submittedBy: 'Dewi Lestari',
      date: subDays(new Date(), 5).toISOString(),
      findings: 'Emergency exit light on the 2nd floor is not functioning.',
      recommendation: 'Replace the bulb and test the battery backup system immediately.',
      riskLevel: 'Medium',
      status: 'Pending',
      category: 'Electrical',
      company: 'Perusahaan A',
      photoUrl: 'https://placehold.co/600x400.png',
    },
];


interface ObservationContextType {
  observations: Observation[];
  addObservation: (observation: Observation) => void;
  updateObservation: (id: string, updatedData: Partial<Observation>) => void;
}

const ObservationContext = React.createContext<ObservationContextType | undefined>(undefined);

export function ObservationProvider({ children }: { children: React.ReactNode }) {
  const [observations, setObservations] = React.useState<Observation[]>(initialObservations);

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
