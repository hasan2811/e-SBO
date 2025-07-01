
'use client';

import { useContext } from 'react';
import { CurrentProjectContext } from '@/contexts/current-project-context';

export function useCurrentProject() {
  const context = useContext(CurrentProjectContext);
  if (context === undefined) {
    throw new Error('useCurrentProject must be used within a CurrentProjectProvider');
  }
  return context;
}
