
'use client';

import * as React from 'react';
import { collection, query, onSnapshot, Unsubscribe, where, orderBy } from 'firebase/firestore';
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
  const { user, isAdmin, loading: authLoading } = useAuth();
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

    // First, wait for the authentication status to be resolved.
    // If auth is still loading, we cannot know which projects to fetch.
    if (authLoading) {
      setLoading(true);
      return;
    }
    
    // If authentication is resolved and there is no user, it means they are logged out.
    // Clear any existing project data and stop loading.
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    // If we reach this point, we have a logged-in user.
    // Start fetching projects and set our own loading state.
    setLoading(true);

    const projectsCollection = collection(db, 'projects');
    
    // The query changes based on user role:
    // - Admins see all projects, ordered by creation date.
    // - Regular users see only projects where their UID is in the `memberUids` array.
    const q = isAdmin 
        ? query(projectsCollection, orderBy('createdAt', 'desc'))
        : query(projectsCollection, where('memberUids', 'array-contains', user.uid), orderBy('createdAt', 'desc'));

    // onSnapshot creates a real-time listener. Any changes in the Firestore
    // data matching the query will automatically trigger this callback.
    unsubscribe = onSnapshot(q, (snapshot) => {
      const serverProjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      
      setProjects(serverProjects);
      setLoading(false); // We've received data, so we can stop loading.
    }, (error) => {
      console.error("Error fetching projects:", error);
      setProjects([]); // Clear projects on error
      setLoading(false); // And stop loading.
    });

    // The cleanup function returned by useEffect.
    // React calls this when the component unmounts or dependencies change,
    // which prevents memory leaks by unsubscribing from the listener.
    return () => unsubscribe();
  }, [user, isAdmin, authLoading]); // Re-run this effect if the user, their admin status, or auth loading state changes.

  const value = { projects, loading, addProject };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
