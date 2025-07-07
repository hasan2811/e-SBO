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
            const projectsCollection = collection(db, 'projects');
            const projectPromises: Promise<any>[] = [];

            // Query 1: Based on projectIds in user profile (for projects that might not have memberUids)
            const userProjectIds = userProfile.projectIds || [];
            if (userProjectIds.length > 0) {
                const q1 = query(projectsCollection, where(documentId(), 'in', userProjectIds));
                projectPromises.push(getDocs(q1));
            }

            // Query 2: Based on memberUids array in projects collection (robust fallback)
            const q2 = query(projectsCollection, where('memberUids', 'array-contains', user.uid));
            projectPromises.push(getDocs(q2));

            const snapshots = await Promise.all(projectPromises);

            const allProjectsMap = new Map<string, Project>();

            snapshots.forEach(snapshot => {
                snapshot.docs.forEach(doc => {
                    if (!allProjectsMap.has(doc.id)) {
                        allProjectsMap.set(doc.id, { id: doc.id, ...doc.data() } as Project);
                    }
                });
            });
            
            const uniqueProjects = Array.from(allProjectsMap.values());
            
            // Safe sorting
            uniqueProjects.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

            setProjects(uniqueProjects);

        } catch (error) {
            console.error("Fatal: Could not fetch projects. This might be a missing Firestore index.", error);
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
