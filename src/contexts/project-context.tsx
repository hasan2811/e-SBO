
'use client';

import * as React from 'react';
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './auth-context';
import type { Project } from '@/lib/types';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  error: string | null;
}

export const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // This query requires a composite index on 'memberUids'. 
      // Firestore will generate a link in the browser console to create it.
      const q = query(collection(db, 'projects'), where('memberUids', 'array-contains', user.uid));
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const projectsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Project));
        setProjects(projectsData);
        setLoading(false);
      }, (err) => {
        console.error("Error fetching projects:", err);
        setError(err.message);
        setLoading(false);
        setProjects([]);
      });

    } catch (e: any) {
        console.error("Error setting up project query:", e);
        setError(e.message);
        setLoading(false);
        setProjects([]);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, authLoading]);

  const value = { projects, loading, error };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
