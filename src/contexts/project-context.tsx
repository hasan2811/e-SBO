
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, where, Unsubscribe, getDocs, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project, UserProfile } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { createProject } from '@/lib/actions/project-actions';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  addProject: (projectName: string) => Promise<void>;
}

export const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

// Helper to fetch a single user profile
async function fetchUserProfile(uid: string): Promise<UserProfile | undefined> {
    if (!uid) return undefined;
    const docRef = doc(db, "users", uid);
    const docSnap = await getDocs(query(collection(db, "users"), where("uid", "==", uid)));
    if (!docSnap.empty) {
        return docSnap.docs[0].data() as UserProfile;
    }
    return undefined;
}


export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const projectsQuery = query(
      collection(db, 'projects'),
      where('memberUids', 'array-contains', user.uid)
    );

    unsubscribe = onSnapshot(projectsQuery, 
      async (snapshot) => {
        const userProjects = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Project[];

        if (userProjects.length > 0) {
            // Since a user can only be in one project, we can simplify this.
            const project = userProjects[0];
            const ownerProfile = await fetchUserProfile(project.ownerUid);
            
            const enrichedProject = {
                ...project,
                owner: ownerProfile,
                members: ownerProfile ? [ownerProfile] : [], // The only member is the owner
            };
            setProjects([enrichedProject]);
        } else {
            setProjects([]);
        }
        setLoading(false);
      }, 
      (error) => {
        console.error("Error fetching projects:", error);
        toast({
          variant: 'destructive',
          title: 'Error Fetching Projects',
          description: "Could not retrieve project list. " + error.message,
        });
        setProjects([]);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  const addProject = React.useCallback(async (projectName: string) => {
    if (!user || !user.email) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to create a project.' });
      return;
    }
    try {
      const ownerProfile = { uid: user.uid, email: user.email, displayName: user.displayName || 'User' };
      const result = await createProject(ownerProfile, projectName);
      if (result.success) {
        toast({ title: 'Success!', description: result.message });
      } else {
        toast({ variant: 'destructive', title: 'Project Creation Failed', description: result.message });
      }
    } catch (error) {
      console.error("Error creating project:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ variant: 'destructive', title: 'Project Creation Failed', description: errorMessage });
    }
  }, [user]);

  const value = { projects, loading, addProject };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
