
'use client';

import { useContext } from 'react';
import { ObservationContext } from '@/contexts/observation-context';

export function useObservations() {
  const context = useContext(ObservationContext);
  if (context === undefined) {
    throw new Error('useObservations must be used within an ObservationProvider');
  }
  return context;
}
