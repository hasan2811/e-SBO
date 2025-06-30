'use client';

import { useContext } from 'react';
import { ProjectContext } from '@/contexts/project-context';

export function useProjects() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}
