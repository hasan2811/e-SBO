
'use client';

import * as React from 'react';
import { collection, query, onSnapshot, Unsubscribe, where } from 'firebase/firestore';
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

    // Start loading as soon as the effect runs and auth is still loading.
    if (authLoading) {
      setLoading(true);
      return;
    }
    
    // If auth is done and there's no user, stop loading and clear projects.
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    // Auth is done and we have a user, so start fetching projects.
    setLoading(true);

    const projectsCollection = collection(db, 'projects');
    const q = isAdmin 
        ? query(projectsCollection) // Admin gets all projects
        : query(projectsCollection, where('memberUids', 'array-contains', user.uid)); // Users get projects they are members of

    unsubscribe = onSnapshot(q, (snapshot) => {
      const serverProjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      
      setProjects(serverProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching projects:", error);
      setProjects([]);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [user, isAdmin, authLoading]);

  const value = { projects, loading };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
