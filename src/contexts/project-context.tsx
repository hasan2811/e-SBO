'use client';

import * as React from 'react';
import { collection, query, onSnapshot, Unsubscribe, where, orderBy, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Project } from '@/lib/types';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  addProject: (project: Project) => void;
}

export const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile, isAdmin, loading: authLoading } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  const addProject = React.useCallback((newProject: Project) => {
    setProjects(prevProjects => {
      // Avoid duplicates if the listener fires simultaneously
      if (prevProjects.find(p => p.id === newProject.id)) {
        return prevProjects;
      }
      const newProjects = [newProject, ...prevProjects];
      // Keep it sorted
      newProjects.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return newProjects;
    });
  }, []);

  React.useEffect(() => {
    let unsubscribe: Unsubscribe = () => {};

    if (authLoading) {
      setLoading(true);
      return;
    }
    
    if (!user || !userProfile) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const projectsCollection = collection(db, 'projects');
    let q;

    if (isAdmin) {
      // Admin gets all projects. Sorting will happen on the client to avoid indexing issues.
      q = query(projectsCollection);
    } else {
      const userProjectIds = userProfile.projectIds || [];
      if (userProjectIds.length === 0) {
        setProjects([]);
        setLoading(false);
        return; // Early exit if user has no projects.
      }
      // Fetch only the projects whose IDs are in the user's profile.
      // This is the correct way to query for documents by their ID.
      q = query(projectsCollection, where(documentId(), 'in', userProjectIds));
    }

    unsubscribe = onSnapshot(q, (snapshot) => {
      const serverProjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      
      // Always sort client-side to ensure consistency and avoid indexing issues.
      serverProjects.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setProjects(serverProjects);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching projects:", error);
      setProjects([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userProfile, isAdmin, authLoading]);

  const value = { projects, loading, addProject };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
