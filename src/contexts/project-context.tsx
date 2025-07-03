
'use client';

import * as React from 'react';
import { collection, query, onSnapshot, Unsubscribe, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Project, UserProfile } from '@/lib/types';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
}

export const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let unsubscribe: Unsubscribe = () => {};

    if (authLoading || !user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const projectsCollection = collection(db, 'projects');
    const q = query(projectsCollection);

    unsubscribe = onSnapshot(q, async (snapshot) => {
      const allProjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];

      const userProjects = isAdmin
        ? allProjects
        : allProjects.filter(p => p.memberUids && p.memberUids.includes(user.uid));

      // Enrich projects with full member and owner profiles
      const enrichedProjects = await Promise.all(
        userProjects.map(async (project) => {
          const memberProfiles: UserProfile[] = [];
          if (project.memberUids && project.memberUids.length > 0) {
            const memberDocs = await Promise.all(
              project.memberUids.map(uid => getDoc(doc(db, 'users', uid)))
            );
            memberDocs.forEach(docSnap => {
              if (docSnap.exists()) {
                memberProfiles.push(docSnap.data() as UserProfile);
              }
            });
          }
          
          const ownerProfile = memberProfiles.find(m => m.uid === project.ownerUid);
          
          return { ...project, members: memberProfiles, owner: ownerProfile };
        })
      );


      setProjects(enrichedProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching projects:", error);
      setProjects([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAdmin, authLoading]);

  const value = { projects, loading };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
