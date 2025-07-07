'use client';

import * as React from 'react';
import { collection, query, where, onSnapshot, orderBy, Unsubscribe } from 'firebase/firestore';
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
  const { user, loading: authLoading } = useAuth();
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
      return () => {};
    }

    if (!user) {
      setProjects([]);
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    const projectsMap = new Map<string, Project>();

    const updateAndSortProjects = () => {
        const allProjects = Array.from(projectsMap.values());
        allProjects.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setProjects(allProjects);
    };

    // Listener 1: Projects where user is a member (for modern projects)
    const memberQuery = query(
        collection(db, 'projects'),
        where('memberUids', 'array-contains', user.uid),
        orderBy('createdAt', 'desc')
    );
    const unsubscribeMember = onSnapshot(memberQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "removed") {
                projectsMap.delete(change.doc.id);
            } else {
                projectsMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() } as Project);
            }
        });
        updateAndSortProjects();
        setLoading(false); // Consider loading finished after first listener returns
    }, (error) => {
        console.error("Error on member projects listener:", error);
        setLoading(false);
    });

    // Listener 2: Projects where user is owner (for legacy compatibility)
    const ownerQuery = query(
        collection(db, 'projects'),
        where('ownerUid', '==', user.uid),
        orderBy('createdAt', 'desc')
    );
    const unsubscribeOwner = onSnapshot(ownerQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "removed") {
                projectsMap.delete(change.doc.id);
            } else {
                projectsMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() } as Project);
            }
        });
        updateAndSortProjects();
        setLoading(false);
    }, (error) => {
        console.error("Error on owner projects listener:", error);
        setLoading(false);
    });

    return () => {
        unsubscribeMember();
        unsubscribeOwner();
    };
  }, [user, authLoading]);

  const value = { projects, loading, addProject, removeProject, updateProject };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
