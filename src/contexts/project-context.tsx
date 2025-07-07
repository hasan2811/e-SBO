
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
        try {
            const userProjectIds = userProfile.projectIds || [];
            
            if (userProjectIds.length === 0) {
              setProjects([]);
              setLoading(false);
              return;
            }

            const projectsCollection = collection(db, 'projects');
            const q = query(projectsCollection, where(documentId(), 'in', userProjectIds));
            const snapshot = await getDocs(q);
            
            const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
            
            // Safe sorting client-side
            fetchedProjects.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

            setProjects(fetchedProjects);

        } catch (error) {
            console.error("Fatal: Could not fetch projects. This can be a missing Firestore index or a network issue.", error);
            // Don't clear projects on error, might be a temporary network issue.
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
