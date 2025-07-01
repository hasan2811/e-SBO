
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, where, Unsubscribe, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project, UserProfile } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { createProject } from '@/lib/actions/project-actions';

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
    let unsubscribe: Unsubscribe | undefined;

    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const projectsQuery = query(
      collection(db, 'projects'),
      where('memberUids', 'array-contains', user.uid)
    );

    unsubscribe = onSnapshot(projectsQuery, 
      async (snapshot) => {
        const userProjects = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Project[];

        if (userProjects.length > 0) {
            const ownerUids = [...new Set(userProjects.map(p => p.ownerUid))];
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('uid', 'in', ownerUids));
            const userDocs = await getDocs(q);
            const ownersMap = new Map<string, UserProfile>();
            userDocs.forEach(doc => ownersMap.set(doc.id, doc.data() as UserProfile));

            const enrichedProjects = userProjects.map(p => ({
                ...p,
                owner: ownersMap.get(p.ownerUid)
            }));
            setProjects(enrichedProjects);
        } else {
            setProjects([]);
        }
        setLoading(false);
      }, 
      (error) => {
        console.error("Error fetching projects:", error);
        toast({
          variant: 'destructive',
          title: 'Error Fetching Projects',
          description: "Could not retrieve project list. " + error.message,
        });
        setProjects([]);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  const addProject = React.useCallback(async (projectName: string) => {
    if (!user || !user.email) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to create a project.' });
      return;
    }
    try {
      await createProject({ uid: user.uid, email: user.email, displayName: user.displayName || 'User' }, projectName);
      toast({ title: 'Success!', description: `Project "${projectName}" was created successfully!` });
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
