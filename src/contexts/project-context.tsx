
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, Unsubscribe, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project, UserProfile } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  error: string | null;
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
  const { user } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const userId = user?.uid;

  React.useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    if (!userId) {
      setProjects([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    // ALTERNATIVE STRATEGY: Fetch all projects and filter on the client.
    // This avoids the 'array-contains' query which seems to be causing the permission-denied error.
    const projectsQuery = query(collection(db, 'projects'));

    unsubscribe = onSnapshot(projectsQuery, 
      async (snapshot) => {
        // Filter projects on the client side
        const allProjects = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Project[];
        const userProjects = allProjects.filter(p => p.memberUids.includes(userId));

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
        setError(null);
      }, 
      (err) => {
        console.error("Error fetching projects:", err);
        // Generic error message now
        setError(`Gagal memuat proyek: ${err.message}`);
        setProjects([]);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId]);

  const value = React.useMemo(() => ({ projects, loading, error }), [projects, loading, error]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
