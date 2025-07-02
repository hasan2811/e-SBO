
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, Unsubscribe, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project, UserProfile } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  error: string | null;
}

export const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

// This function remains the same, it's efficient for fetching member profiles.
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
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    
    if (!user) {
      setProjects([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    
    // NEW STRATEGY: Fetch ALL projects and filter on the client.
    // This avoids the complex and fragile 'array-contains' query that was causing permission errors.
    const projectsQuery = query(collection(db, 'projects'));

    const unsubscribe = onSnapshot(projectsQuery, 
      async (snapshot) => {
        try {
          setError(null);
          const allProjects = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Project[];
          
          // Filter projects on the client side
          const userProjects = allProjects.filter(p => p.memberUids && p.memberUids.includes(user.uid));

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
        } catch (e: any) {
           console.error("Error processing project snapshot:", e);
           setError("Gagal memproses data proyek.");
           setProjects([]);
        } finally {
          setLoading(false);
        }
      }, 
      (err) => {
        console.error("GAGAL MENGAMBIL SNAPSHOT PROYEK:", err);
        setError(`Gagal memuat proyek: ${err.message}`);
        setProjects([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading]);

  const value = { projects, loading, error };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
