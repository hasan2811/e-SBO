
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, Unsubscribe, getDocs, where, doc, getDoc, documentId } from 'firebase/firestore';
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
  const { user, userProfile, loading: authLoading } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    const fetchProjects = () => {
      if (authLoading) {
        setLoading(true);
        return;
      }

      if (!user || !userProfile) {
        setProjects([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const projectIds = userProfile.projectIds || [];

      if (projectIds.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      // Firestore 'in' queries are limited to 30 items. We chunk the requests.
      const chunkedProjectIds: string[][] = [];
      for (let i = 0; i < projectIds.length; i += 30) {
          chunkedProjectIds.push(projectIds.slice(i, i + 30));
      }

      const allUnsubscribes: Unsubscribe[] = [];
      let allProjects: Project[] = [];
      let completedChunks = 0;

      if (chunkedProjectIds.length === 0) {
          setProjects([]);
          setLoading(false);
          return;
      }

      const processProjects = async () => {
        const allMemberUids = [...new Set(allProjects.flatMap(p => p.memberUids || []))];
        if (allMemberUids.length > 0) {
          const allMemberProfiles = await fetchUserProfiles(allMemberUids);
          const profilesMap = new Map(allMemberProfiles.map(p => [p.uid, p]));
          
          const enrichedProjects = allProjects.map(project => ({
            ...project,
            owner: profilesMap.get(project.ownerUid),
            members: (project.memberUids || []).map(uid => profilesMap.get(uid)).filter((p): p is UserProfile => !!p),
          }));
          
          setProjects(enrichedProjects);
        } else {
          setProjects(allProjects);
        }
        setLoading(false);
      };

      chunkedProjectIds.forEach(chunk => {
        const projectsQuery = query(collection(db, 'projects'), where(documentId(), 'in', chunk));
        
        const unsub = onSnapshot(projectsQuery, (snapshot) => {
            const newProjects = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Project[];
            
            // Replace old projects from this chunk with new ones
            const currentIds = new Set(newProjects.map(p => p.id));
            allProjects = allProjects.filter(p => !chunk.includes(p.id));
            allProjects.push(...newProjects);

            // Debounce or process only after all chunks are initially loaded
            // For simplicity in onSnapshot, we'll re-enrich every time.
            processProjects();

        }, (err) => {
            console.error("GAGAL MENGAMBIL SNAPSHOT PROYEK:", err);
            setError(`Gagal memuat proyek: ${err.message}.`);
            setProjects([]);
            setLoading(false);
        });
        allUnsubscribes.push(unsub);
      });

      unsubscribe = () => {
        allUnsubscribes.forEach(unsub => unsub());
      };
    };

    fetchProjects();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, userProfile, authLoading]);

  const value = { projects, loading, error };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
