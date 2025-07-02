

'use client';

import * as React from 'react';
import { Loader2, LogIn, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { collection, query, getDocs, limit, doc, runTransaction, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';

type ProjectSearchResult = { id: string; name: string };

interface JoinProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinProjectDialog({ isOpen, onOpenChange }: JoinProjectDialogProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isFetching, setIsFetching] = React.useState(false);
  const [isJoining, setIsJoining] = React.useState<string | null>(null);
  const [allProjects, setAllProjects] = React.useState<ProjectSearchResult[]>([]);

  React.useEffect(() => {
    const fetchProjects = async () => {
      if (isOpen) {
        setIsFetching(true);
        setAllProjects([]);
        try {
          const projectsRef = collection(db, 'projects');
          const q = query(projectsRef, limit(200)); // Limit to 200 projects for performance
          const snapshot = await getDocs(q);
          
          const results = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name as string }));
          setAllProjects(results);

          if (results.length === 0) {
            toast({ variant: 'default', title: 'No Projects Available', description: 'There are no projects to join at the moment.' });
          }
        } catch (error) {
          console.error("Failed to fetch projects:", error);
          toast({ variant: 'destructive', title: 'Error Fetching Projects', description: 'Could not load the list of projects. Please try again later.' });
        } finally {
          setIsFetching(false);
        }
      }
    };

    fetchProjects();
  }, [isOpen, toast]);

  const onJoin = async (projectToJoin: ProjectSearchResult) => {
    if (!user || !userProfile) return;

    if (userProfile.projectIds?.includes(projectToJoin.id)) {
      toast({ variant: 'default', title: 'Already a Member', description: 'You are already a member of this project.' });
      return;
    }

    setIsJoining(projectToJoin.id);
    try {
        const projectRef = doc(db, 'projects', projectToJoin.id);
        const userRef = doc(db, 'users', user.uid);

        await runTransaction(db, async (transaction) => {
          transaction.update(projectRef, {
              memberUids: arrayUnion(user.uid)
          });
          transaction.update(userRef, {
              projectIds: arrayUnion(projectToJoin.id)
          });
        });
        
        toast({ title: 'Success!', description: `Successfully joined the project "${projectToJoin.name}"!` });
        onOpenChange(false);
    } catch (error) {
        console.error("Failed to join project:", error);
        toast({ variant: 'destructive', title: 'Error Joining Project', description: 'An unexpected error occurred.'});
    } finally {
        setIsJoining(null);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Join an Existing Project
          </DialogTitle>
          <DialogDescription>
            Select a project from the list below to join.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 h-[250px]">
            <ScrollArea className="h-full">
                <div className="space-y-2 pr-4">
                    {isFetching && (
                      <div className="space-y-2">
                        {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                      </div>
                    )}
                    {!isFetching && allProjects.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-10">No projects available to join.</p>
                    )}
                    {!isFetching && allProjects.map(project => (
                        <div key={project.id} className="flex items-center justify-between rounded-md border p-3">
                            <div className="flex items-center gap-3">
                                <Briefcase className="h-5 w-5 text-primary" />
                                <span className="font-medium">{project.name}</span>
                            </div>
                            <Button size="sm" onClick={() => onJoin(project)} disabled={!!isJoining}>
                                {isJoining === project.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Join'}
                            </Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
