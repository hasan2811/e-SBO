
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, where, Unsubscribe, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project, UserProfile } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { createProject } from '@/lib/actions/project-actions';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  addProject: (projectName: string) => Promise<{ success: boolean; message: string; }>;
}

export const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

async function fetchUserProfiles(uids: string[]): Promise<UserProfile[]> {
    if (uids.length === 0) return [];
    
    const profiles: UserProfile[] = [];
    const chunkSize = 30; // Firestore 'in' query can handle up to 30 items.
    for (let i = 0; i < uids.length; i += chunkSize) {
        const chunk = uids.slice(i, i + chunkSize);
        const usersQuery = query(collection(db, "users"), where("uid", "in", chunk));
        const querySnapshot = await getDocs(usersQuery);
        querySnapshot.forEach(doc => {
            profiles.push(doc.data() as UserProfile);
        });
    }
    
    return profiles;
}


export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const userId = user?.uid; // Use a stable primitive for the dependency array

  React.useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    if (!userId) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const projectsQuery = query(
      collection(db, 'projects'),
      where('memberUids', 'array-contains', userId)
    );

    unsubscribe = onSnapshot(projectsQuery, 
      async (snapshot) => {
        const userProjects = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Project[];

        const allMemberUids = [...new Set(userProjects.flatMap(p => p.memberUids || []))];
        
        if (allMemberUids.length > 0) {
            const allMemberProfiles = await fetchUserProfiles(allMemberUids);
            const profilesMap = new Map(allMemberProfiles.map(p => [p.uid, p]));

            const enrichedProjects = userProjects.map(project => ({
              ...project,
              owner: profilesMap.get(project.ownerUid),
              members: (project.memberUids || []).map(uid => profilesMap.get(uid)).filter((p): p is UserProfile => !!p),
            }));
            
            setProjects(enrichedProjects);
        } else {
            setProjects(userProjects);
        }
        
        setLoading(false);
      }, 
      (error) => {
        console.error("Error fetching projects:", error);
        setProjects([]);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId]); // Depend on the stable userId string, not the whole user object

  const addProject = React.useCallback(async (projectName: string) => {
    if (!user || !userProfile) {
      return { success: false, message: 'User profile not loaded. Please try again.' };
    }
    try {
      // Pass the serializable user.uid instead of the whole user object
      return await createProject(user.uid, projectName);
    } catch (error) {
      console.error("Error creating project via context:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      return { success: false, message: errorMessage };
    }
  }, [user, userProfile]);

  const value = React.useMemo(() => ({ projects, loading, addProject }), [projects, loading, addProject]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
