
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
    // This useEffect is temporarily disabled to isolate the write operation.
    // It immediately sets loading to false and returns an empty project list.
    // This provides a clean console for diagnosing the "Create Project" feature.
    const diagnoseWriteOperation = () => {
      setLoading(false);
      setProjects([]);
      setError(null);
    };

    diagnoseWriteOperation();
    
    // The original data fetching logic is kept here but commented out.
    // We will re-enable this once the write operation is confirmed to be working.
    /*
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

      const projectsQuery = query(collection(db, 'projects'), where(documentId(), 'in', projectIds));
      
      unsubscribe = onSnapshot(projectsQuery, async (snapshot) => {
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
      }, (err) => {
          console.error("GAGAL MENGAMBIL SNAPSHOT PROYEK:", err);
          setError(`Gagal memuat proyek: ${err.message}.`);
          setProjects([]);
          setLoading(false);
      });
    };

    fetchProjects();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    */
  }, [user, userProfile, authLoading]);

  const value = { projects, loading, error };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
