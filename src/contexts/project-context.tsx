
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, where, Unsubscribe, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project, UserProfile } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
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

  const value = React.useMemo(() => ({ projects, loading }), [projects, loading]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
