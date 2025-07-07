
'use client';

import * as React from 'react';
import { doc, getDoc } from 'firebase/firestore';
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
  
  // These are for optimistic updates, they don't trigger refetches.
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

  // The definitive data fetching logic based on the user's profile.
  React.useEffect(() => {
    // This function will fetch project details based on an array of IDs from the user's profile.
    const fetchProjects = async (projectIds: string[]) => {
      setLoading(true);
      try {
        const projectPromises = projectIds.map(id => getDoc(doc(db, 'projects', id)));
        const projectSnapshots = await Promise.all(projectPromises);
        
        const fetchedProjects = projectSnapshots
          .filter(snap => snap.exists())
          .map(snap => ({ id: snap.id, ...snap.data() } as Project));
          
        fetchedProjects.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setProjects(fetchedProjects);

      } catch (error) {
        console.error("Error fetching project details:", error);
        setProjects([]); // Clear projects on error
      } finally {
        setLoading(false);
      }
    };

    // If auth is still loading, we are also loading.
    if (authLoading) {
      setLoading(true);
      setProjects([]);
      return;
    }

    // If auth is done and we have a user with project IDs, fetch them.
    if (userProfile && userProfile.projectIds && userProfile.projectIds.length > 0) {
      fetchProjects(userProfile.projectIds);
    } else {
      // If user has no projects or no profile, stop loading and show empty list.
      setProjects([]);
      setLoading(false);
    }
  }, [userProfile, authLoading]); // Re-run only when the user profile or auth state changes.


  const value = { projects, loading, addProject, removeProject, updateProject };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
