'use client';

import * as React from 'react';
import { collection, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  addProject: (projectName: string) => Promise<void>;
}

export const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (user?.uid) {
      setLoading(true);
      const q = query(
        collection(db, 'projects'),
        where('memberUids', 'array-contains', user.uid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const userProjects = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Project[];
        setProjects(userProjects);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching projects:", error);
        toast({
          variant: 'destructive',
          title: 'Error Fetching Projects',
          description: 'Could not load your projects. Please try again later.',
        });
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Not logged in, clear projects and stop loading
      setProjects([]);
      setLoading(false);
    }
  }, [user]);

  const addProject = React.useCallback(async (projectName: string) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return;
    }
    try {
      await addDoc(collection(db, 'projects'), {
        name: projectName,
        ownerUid: user.uid,
        memberUids: [user.uid],
        createdAt: new Date().toISOString(),
      });
      toast({ title: 'Project Created!', description: `Project "${projectName}" was successfully created.` });
    } catch (error) {
      console.error("Error creating project:", error);
      toast({ variant: 'destructive', title: 'Project Creation Failed' });
    }
  }, [user]);

  const value = { projects, loading, addProject };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
