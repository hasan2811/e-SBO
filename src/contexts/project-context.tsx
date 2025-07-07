
'use client';

import * as React from 'react';
import { collection, query, getDocs, where, documentId } from 'firebase/firestore';
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
  const { user, userProfile, loading: authLoading } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  const addProject = React.useCallback((newProject: Project) => {
    setProjects(prevProjects => {
      if (prevProjects.find(p => p.id === newProject.id)) {
        return prevProjects;
      }
      const newProjects = [newProject, ...prevProjects];
      newProjects.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user || !userProfile) {
      setProjects([]);
      setLoading(false);
      return;
    }

    const fetchProjects = async () => {
        setLoading(true);
        const userProjectIds = userProfile.projectIds || [];
        if (userProjectIds.length === 0) {
            setProjects([]);
            setLoading(false);
            return;
        }

        try {
            const projectsCollection = collection(db, 'projects');
            // This query fetches all project documents whose ID is in the user's list.
            const q = query(projectsCollection, where(documentId(), 'in', userProjectIds));
            const querySnapshot = await getDocs(q);

            const serverProjects = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Project[];

            // Sort client-side to ensure a consistent order.
            serverProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setProjects(serverProjects);
        } catch (error) {
            console.error("Error fetching projects by IDs:", error);
            // Do not clear projects on error, might be a temporary network issue.
        } finally {
            setLoading(false);
        }
    };

    fetchProjects();
  }, [user, userProfile, authLoading]);

  const value = { projects, loading, addProject, removeProject, updateProject };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
