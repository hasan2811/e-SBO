
'use client';

import * as React from 'react';
import { collection, query, onSnapshot, Unsubscribe } from 'firebase/firestore';
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

    // Do not fetch if auth is still loading or if there's no user
    if (authLoading || !user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const projectsCollection = collection(db, 'projects');
    // Simplified query: Always fetch ALL projects. Filtering will be done on the client.
    // This avoids complex query/security rule conflicts.
    const q = query(projectsCollection);

    unsubscribe = onSnapshot(q, (snapshot) => {
      const allProjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];

      // Client-side filtering logic:
      const userProjects = isAdmin
        ? allProjects // Admin sees all projects
        : allProjects.filter(p => p.memberUids && p.memberUids.includes(user.uid));

      // Sort projects by creation date, newest first
      setProjects(userProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    }, (error) => {
      // This error block is hit when security rules reject the query.
      console.error("Error fetching projects (check Firestore security rules):", error);
      setProjects([]);
      setLoading(false);
    });

    // Cleanup the listener when the component unmounts or dependencies change
    return () => unsubscribe();
  }, [user, isAdmin, authLoading]);

  const value = { projects, loading };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
