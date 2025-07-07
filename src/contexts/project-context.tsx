'use client';

import * as React from 'react';
import { collection, query, where, onSnapshot, Unsubscribe, documentId } from 'firebase/firestore';
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

  // Use a stable reference for project IDs to avoid re-running the effect unnecessarily
  const projectIdsJson = JSON.stringify(userProfile?.projectIds || []);

  React.useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    if (authLoading) {
      setLoading(true);
      return;
    }

    const projectIds = JSON.parse(projectIdsJson) as string[];

    if (!projectIds || projectIds.length === 0) {
      setProjects([]);
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    
    // Firestore 'in' queries are limited to 30 elements. Chunking is needed for more.
    // For this app, we assume a user won't be in more than 30 projects.
    const projectsQuery = query(
      collection(db, 'projects'),
      where(documentId(), 'in', projectIds)
    );

    unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
        const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        fetchedProjects.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setProjects(fetchedProjects);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching projects by IDs:", error);
        setProjects([]);
        setLoading(false);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [projectIdsJson, authLoading]);


  const value = { projects, loading, addProject, removeProject, updateProject };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
