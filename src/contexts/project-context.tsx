
'use client';

import * as React from 'react';
import type { Project } from '@/lib/types';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  error: string | null;
}

export const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

// This context is temporarily simplified to prevent "fetch" errors from cluttering the console
// during the critical write-test.
export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const value = { 
    projects: [], 
    loading: false, 
    error: null 
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
