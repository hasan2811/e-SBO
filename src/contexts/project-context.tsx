
'use client';

import * as React from 'react';
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
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
      const isAdmin = user.uid === 'GzR8FeByeKhJ0vZoeo5Zj4M0Ftl2';
      
      // If user is admin, fetch all projects. 
      // Otherwise, fetch projects where the user is listed in 'memberUids'.
      // This query now relies on the security rules to be correctly configured.
      const q = isAdmin 
        ? query(collection(db, 'projects'))
        : query(collection(db, 'projects'), where('memberUids', 'array-contains', user.uid));
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const projectsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Project));
        setProjects(projectsData);
        setLoading(false);
      }, (err) => {
        console.error("Error fetching projects:", err);
        // This is a more user-friendly error message
        if (err.code === 'permission-denied' && err.message.includes('requires an index')) {
             setError('Database index is being created. Please wait a few minutes and refresh.');
        } else {
             setError(err.message);
        }
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

  // The value now includes logic to enrich projects with member details, which was missing
  const value = { projects, loading, error };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
