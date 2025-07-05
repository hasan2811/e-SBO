
'use client';

import * as React from 'react';
import { collection, query, onSnapshot, Unsubscribe, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Project } from '@/lib/types';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
}

export const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    let unsubscribe: Unsubscribe = () => {};

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

    const projectsCollection = collection(db, 'projects');
    // Updated queries to use orderBy for server-side sorting, matching the new indexes.
    const q = isAdmin 
        ? query(projectsCollection, orderBy('createdAt', 'desc'))
        : query(projectsCollection, where('memberUids', 'array-contains', user.uid), orderBy('createdAt', 'desc'));

    unsubscribe = onSnapshot(q, (snapshot) => {
      const serverProjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      
      // Removed client-side sorting as it's now handled by the server query.
      setProjects(serverProjects);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching projects:", error);
      setProjects([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAdmin, authLoading]);

  const value = { projects, loading };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
