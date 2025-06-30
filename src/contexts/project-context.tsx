
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { createProject } from '@/lib/actions/project-actions';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  addProject: (projectName: string, memberEmails: string) => Promise<void>;
}

export const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let unsubscribe: () => void = () => {};

    if (user?.uid) {
      setLoading(true);
      const projectsQuery = query(
        collection(db, 'projects'),
        where('memberUids', 'array-contains', user.uid)
      );

      unsubscribe = onSnapshot(projectsQuery, 
        (snapshot) => {
          const userProjects = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Project[];
          setProjects(userProjects);
          setLoading(false);
        }, 
        (error) => {
          console.error("Error fetching projects:", error);
          toast({
            variant: 'destructive',
            title: 'Error Fetching Projects',
            description: "Could not retrieve project list. This might be a permissions issue. " + error.message,
          });
          setProjects([]);
          setLoading(false);
        }
      );
    } else {
      setProjects([]);
      setLoading(false);
    }

    return () => unsubscribe();
  }, [user]);

  const addProject = React.useCallback(async (projectName: string, memberEmailsStr: string) => {
    if (!user || !user.email) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to create a project.' });
      return;
    }
    try {
      const result = await createProject({ uid: user.uid, email: user.email }, projectName, memberEmailsStr);
      if (result.success) {
        toast({ title: 'Success!', description: result.message });
      } else {
        toast({ variant: 'destructive', title: 'Project Creation Failed', description: result.message });
      }
    } catch (error) {
      console.error("Error creating project:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ variant: 'destructive', title: 'Project Creation Failed', description: errorMessage });
    }
  }, [user]);

  const value = { projects, loading, addProject };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
