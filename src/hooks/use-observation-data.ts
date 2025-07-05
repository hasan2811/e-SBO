'use client';

import { useContext } from 'react';
import { ObservationContext } from '@/contexts/observation-context';

/**
 * A simple hook to access observation data and retrieval functions from the context.
 * This hook does NOT trigger data fetching and is safe to use in components
 * that only need to read data that has already been loaded by a master component (like FeedView).
 */
export function useObservationData() {
  const context = useContext(ObservationContext);
  if (context === undefined) {
    throw new Error('useObservationData must be used within an ObservationProvider');
  }
  
  // Return only the data and the getter functions, not the fetching logic.
  const { 
    items, 
    getObservationById, 
    getInspectionById, 
    getPtwById 
  } = context;

  return { 
    items, 
    getObservationById, 
    getInspectionById, 
    getPtwById 
  };
}
