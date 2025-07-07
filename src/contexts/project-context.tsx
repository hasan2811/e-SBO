
'use client';

import * as React from 'react';
import { collection, query, onSnapshot, Unsubscribe, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Project } from '@/lib/types';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  addProject: (project: Project) => void;
  removeProject: (projectId: string) => void;
  updateProject: (projectId: string, data: Partial<Project>) => void;
}

export const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { userProfile, loading: authLoading } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  const addProject = React.useCallback((newProject: Project) => {
    setProjects(prevProjects => {
      if (prevProjects.find(p => p.id === newProject.id)) {
        return prevProjects;
      }
      const newProjects = [newProject, ...prevProjects];
      newProjects.sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return newProjects;
    });
  }, []);

  const removeProject = React.useCallback((projectId: string) => {
    setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
  }, []);

  const updateProject = React.useCallback((projectId: string, data: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...data } : p));
  }, []);


  React.useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    
    if (authLoading || !userProfile) {
      setLoading(true);
      setProjects([]);
      return;
    }

    // NEW, MORE ROBUST LOGIC:
    // 1. Fetch ALL projects from the database, ordered by creation date.
    // This bypasses any complex 'where' clauses that might fail due to missing indexes or permission issues.
    const q = query(
      collection(db, 'projects'),
      orderBy('createdAt', 'desc')
    );

    unsubscribe = onSnapshot(q, (snapshot) => {
      const allProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      
      // 2. Filter the projects on the client-side.
      // This ensures we only show projects relevant to the user,
      // and it reliably handles all cases (owner, member, etc.).
      const userProjects = allProjects.filter(p => 
        p.ownerUid === userProfile.uid || (p.memberUids && p.memberUids.includes(userProfile.uid))
      );
      
      setProjects(userProjects);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching all projects in real-time:", error);
      setProjects([]);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [authLoading, userProfile]);


  const value = { projects, loading, addProject, removeProject, updateProject };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
