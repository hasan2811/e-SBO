
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
    const chunkSize = 30; 
    for (let i = 0; i < uids.length; i += chunkSize) {
        const chunk = uids.slice(i, i + chunkSize);
        const usersQuery = query(collection(db, "users"), where("uid", "in", chunk));
        try {
            const querySnapshot = await getDocs(usersQuery);
            querySnapshot.forEach(doc => {
                profiles.push(doc.data() as UserProfile);
            });
        } catch (error) {
            console.error("Gagal mengambil profil anggota:", error);
        }
    }
    
    return profiles;
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

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
    
    // This is the new, more robust query.
    // It finds all projects where the current user's ID is in the memberUids array.
    const projectsQuery = query(collection(db, 'projects'), where('memberUids', 'array-contains', user.uid));

    unsubscribe = onSnapshot(projectsQuery, async (snapshot) => {
      setError(null);
      const newProjects = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Project[];
      
      if (newProjects.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }
      
      // Enrich projects with full member and owner profiles for use in the UI
      const allMemberUids = [...new Set(newProjects.flatMap(p => p.memberUids || []))];
      const allMemberProfiles = await fetchUserProfiles(allMemberUids);
      const profilesMap = new Map(allMemberProfiles.map(p => [p.uid, p]));
          
      const enrichedProjects = newProjects.map(project => ({
        ...project,
        owner: profilesMap.get(project.ownerUid),
        members: (project.memberUids || []).map(uid => profilesMap.get(uid)).filter((p): p is UserProfile => !!p),
      }));

      setProjects(enrichedProjects);
      setLoading(false);

    }, (err) => {
      console.error("Error fetching projects:", err);
      // This error message will guide the user to create the necessary index.
      setError(`Gagal memuat proyek. Ini mungkin memerlukan pembuatan indeks di database. Cek konsol browser untuk link pembuatan indeks otomatis dari Firebase. Pesan error: ${err.message}`);
      setProjects([]);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, authLoading]);

  const value = { projects, loading, error };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
