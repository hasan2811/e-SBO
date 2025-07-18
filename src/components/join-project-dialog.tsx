
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn, User, Folder } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { Project, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { doc, runTransaction, arrayUnion, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useProjects } from '@/hooks/use-projects';

interface JoinableProject extends Project {
  owner: UserProfile | null;
}

interface JoinProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinProjectDialog({ isOpen, onOpenChange }: JoinProjectDialogProps) {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { projects: userProjects, addProject } = useProjects();
  const [loadingProjects, setLoadingProjects] = React.useState(true);
  const [joiningProjectId, setJoiningProjectId] = React.useState<string | null>(null);
  const [joinableProjects, setJoinableProjects] = React.useState<JoinableProject[]>([]);

  React.useEffect(() => {
    if (!isOpen) {
      setJoinableProjects([]);
      setJoiningProjectId(null);
      setLoadingProjects(true); 
      return;
    }

    if (!userProfile) {
      return;
    }
    
    const fetchJoinableProjects = async () => {
      setLoadingProjects(true);
      try {
        const q = query(collection(db, "projects"), where("isOpen", "==", true));
        const projectsSnapshot = await getDocs(q);
        
        const openProjects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];

        const userProjectIds = userProjects.map(p => p.id);
        
        const finalJoinableProjects = openProjects.filter(p => !userProjectIds.includes(p.id));

        const projectsWithOwners = await Promise.all(
          finalJoinableProjects.map(async project => {
            let owner: UserProfile | null = null;
            if (project.ownerUid) {
              try {
                const userDocRef = doc(db, 'users', project.ownerUid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                  owner = userDocSnap.data() as UserProfile;
                }
              } catch (e) {
                console.warn(`Could not load owner profile for project ${project.id}`);
              }
            }
            return { ...project, owner };
          })
        );

        setJoinableProjects(projectsWithOwners);
      } catch (error) {
        console.error("Failed to fetch joinable projects:", error);
        toast({ variant: 'destructive', title: 'Failed to Load Projects', description: 'Could not retrieve the list of available projects.' });
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchJoinableProjects();
    
  }, [isOpen, userProfile, userProjects, toast]);

  const onJoin = async (projectToJoin: JoinableProject) => {
    if (!user || !userProfile) {
      toast({ variant: 'destructive', title: 'Authentication Error' });
      return;
    }

    setJoiningProjectId(projectToJoin.id);
    try {
      const projectRef = doc(db, 'projects', projectToJoin.id);
      const userRef = doc(db, 'users', user.uid);

      await runTransaction(db, async (transaction) => {
        const projectSnap = await transaction.get(projectRef);
        const userSnap = await transaction.get(userRef);

        if (!projectSnap.exists()) throw new Error('Project not found');
        if (!userSnap.exists()) throw new Error("User profile not found. Cannot join project.");
        if (projectSnap.data()?.isOpen === false) throw new Error('Project is not open for joining.');

        transaction.update(projectRef, { memberUids: arrayUnion(user.uid) });
        transaction.update(userRef, { projectIds: arrayUnion(projectToJoin.id) });
      });
      
      addProject(projectToJoin);

      toast({ title: 'Success!', description: `Successfully joined the project!` });
      onOpenChange(false);
      router.push(`/proyek/${projectToJoin.id}/observasi`);
    } catch (error: any) {
      let description = 'An unexpected error occurred.';
      if (error.message === 'Project not found') {
        description = 'Project with that ID was not found.';
      } else if (error.message === 'Project is not open for joining.') {
        description = 'This project is currently closed to new members.';
      } else {
        description = error.message;
      }
      toast({ variant: 'destructive', title: 'Failed to Join', description });
    } finally {
      setJoiningProjectId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Join a Project
          </DialogTitle>
          <DialogDescription>
            Select a project from the list below to join.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh]">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
              {loadingProjects ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <Skeleton className="h-8 w-8 rounded-md mt-1 flex-shrink-0" />
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardFooter className="flex justify-between items-center bg-muted/50 py-3 px-6">
                      <Skeleton className="h-5 w-36" />
                      <Skeleton className="h-9 w-20 rounded-md" />
                    </CardFooter>
                  </Card>
                ))
              ) : joinableProjects.length > 0 ? (
                joinableProjects.map((project) => (
                  <Card key={project.id}>
                    <CardHeader>
                        <div className="flex items-start gap-4">
                            <Folder className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
                            <div>
                                <CardTitle>{project.name}</CardTitle>
                                <CardDescription>Project available to join</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardFooter className="flex justify-between items-center bg-muted/50 py-3 px-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span className="font-medium">Owner: {project.owner?.displayName || 'Unknown'}</span>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => onJoin(project)}
                            disabled={!!joiningProjectId}
                        >
                            {joiningProjectId === project.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Join
                        </Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">There are no available projects to join at this moment.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
