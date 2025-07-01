
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, where, Unsubscribe, getDocs, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project, UserProfile } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { createProject } from '@/lib/actions/project-actions';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  addProject: (projectName: string, memberEmails: string[]) => Promise<void>;
}

export const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

// Helper to fetch user profiles in chunks
async function fetchUserProfiles(uids: string[]): Promise<Map<string, UserProfile>> {
    const profilesMap = new Map<string, UserProfile>();
    if (uids.length === 0) return profilesMap;

    const usersRef = collection(db, "users");
    const chunks: string[][] = [];
    for (let i = 0; i < uids.length; i += 30) {
        chunks.push(uids.slice(i, i + 30));
    }

    await Promise.all(
        chunks.map(async (chunk) => {
            const q = query(usersRef, where('uid', 'in', chunk));
            const snapshot = await getDocs(q);
            snapshot.forEach((doc) => {
                profilesMap.set(doc.id, doc.data() as UserProfile);
            });
        })
    );
    return profilesMap;
}


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
            const allMemberUids = [...new Set(userProjects.flatMap(p => p.memberUids))];
            const profilesMap = await fetchUserProfiles(allMemberUids);
            
            const enrichedProjects = userProjects.map(p => ({
                ...p,
                owner: profilesMap.get(p.ownerUid),
                members: p.memberUids.map(uid => profilesMap.get(uid)).filter(Boolean) as UserProfile[],
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

  const addProject = React.useCallback(async (projectName: string, memberEmails: string[]) => {
    if (!user || !user.email) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to create a project.' });
      return;
    }
    try {
      const ownerProfile = { uid: user.uid, email: user.email, displayName: user.displayName || 'User' };
      const result = await createProject(ownerProfile, projectName, memberEmails);
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
