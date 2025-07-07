
'use client';

import * as React from 'react';
import { collection, query, where, onSnapshot, Unsubscribe, documentId, getDocs } from 'firebase/firestore';
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
    const fetchProjects = async () => {
        if (authLoading) {
            setLoading(true);
            return;
        }

        const projectIds = JSON.parse(projectIdsJson) as string[];

        if (!projectIds || projectIds.length === 0) {
            setProjects([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Firestore 'in' queries are limited to 30 elements per batch.
            // Chunking the array to handle more than 30 projects if needed.
            const chunks: string[][] = [];
            for (let i = 0; i < projectIds.length; i += 30) {
                chunks.push(projectIds.slice(i, i + 30));
            }

            const fetchPromises = chunks.map(chunk =>
                getDocs(query(collection(db, 'projects'), where(documentId(), 'in', chunk)))
            );
            
            const allSnapshots = await Promise.all(fetchPromises);
            const fetchedProjects = allSnapshots.flatMap(snapshot =>
                snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project))
            );

            fetchedProjects.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setProjects(fetchedProjects);
        } catch (error) {
            console.error("Error fetching projects by IDs:", error);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    fetchProjects();
  }, [projectIdsJson, authLoading]);


  const value = { projects, loading, addProject, removeProject, updateProject };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
