
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, where, Unsubscribe, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project, UserProfile } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  error: string | null; // New state to hold error messages
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
  const [error, setError] = React.useState<string | null>(null); // New error state
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
    setError(null); // Reset error on new fetch
    
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
        setError(null); // Clear error on success
      }, 
      (err) => {
        console.error("Error fetching projects:", err);
        // This is the crucial part: detect the missing index error
        if (err.code === 'failed-precondition') {
          setError(
            'Diperlukan Konfigurasi Database. Galat ini biasanya berarti indeks Firestore yang diperlukan belum dibuat. Silakan buka konsol developer browser (tekan F12), temukan pesan galat Firestore yang asli (cari "FAILED_PRECONDITION"), dan klik tautan yang disediakan untuk membuat indeks secara otomatis. Aplikasi mungkin tidak akan berfungsi dengan benar sampai ini diselesaikan.'
          );
        } else {
          setError(`Gagal memuat proyek: ${err.message}`);
        }
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
