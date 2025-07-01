
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, where, Unsubscribe, getDocs, doc, getDoc } from 'firebase/firestore';
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

async function fetchUserProfiles(uids: string[]): Promise<UserProfile[]> {
    if (uids.length === 0) return [];
    
    // Fetch multiple documents. Note: `in` queries are limited to 30 items.
    // For this app's scale, this is acceptable. For larger scale, fetch one by one.
    const usersQuery = query(collection(db, "users"), where("uid", "in", uids));
    const querySnapshot = await getDocs(usersQuery);
    
    const profilesMap = new Map<string, UserProfile>();
    querySnapshot.forEach(doc => {
        const user = doc.data() as UserProfile;
        profilesMap.set(user.uid, user);
    });

    // Return profiles in the same order as requested UIDs
    return uids.map(uid => profilesMap.get(uid)).filter(Boolean) as UserProfile[];
}


export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth();
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

        const enrichedProjects = await Promise.all(
          userProjects.map(async (project) => {
            const memberProfiles = await fetchUserProfiles(project.memberUids);
            const ownerProfile = memberProfiles.find(m => m.uid === project.ownerUid);
            return {
              ...project,
              owner: ownerProfile,
              members: memberProfiles,
            };
          })
        );
        
        setProjects(enrichedProjects);
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
    if (!user || !userProfile) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'User profile not loaded. Please try again.' });
      return;
    }
    try {
      const ownerInfo = { uid: userProfile.uid, email: userProfile.email, displayName: userProfile.displayName };
      const result = await createProject(ownerInfo, projectName);
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
  }, [user, userProfile]);

  const value = { projects, loading, addProject };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
