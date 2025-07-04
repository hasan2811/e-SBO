
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

    // Don't do anything until auth state is resolved.
    if (authLoading) {
      setLoading(true);
      return;
    }
    
    // If no user, there are no projects to fetch.
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    // At this point, we have a user. Start loading projects.
    setLoading(true);

    const projectsCollection = collection(db, 'projects');
    const q = isAdmin 
        ? query(projectsCollection)
        : query(projectsCollection, where('memberUids', 'array-contains', user.uid));

    unsubscribe = onSnapshot(q, (snapshot) => {
      const userProjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      
      setProjects(userProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false); // Stop loading once projects are fetched
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
