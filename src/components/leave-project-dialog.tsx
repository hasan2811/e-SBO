'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { Project } from '@/lib/types';
import { Loader2, LogOut } from 'lucide-react';
import { doc, arrayRemove, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useProjects } from '@/hooks/use-projects';

interface LeaveProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSuccess?: (projectId: string) => void;
}

export function LeaveProjectDialog({
  isOpen,
  onOpenChange,
  project,
  onSuccess,
}: LeaveProjectDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { removeProject } = useProjects();
  const [isLeaving, setIsLeaving] = React.useState(false);

  const handleLeave = async () => {
    if (!user || !project) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User or project not found.',
      });
      return;
    }

    setIsLeaving(true);

    // 1. Optimistic UI update for an instant response
    removeProject(project.id);
    toast({
      title: 'Successfully Left Project',
      description: `You have left the project "${project.name}".`,
    });
    onSuccess?.(project.id); // Close the dialog immediately

    // 2. Background DB operation
    try {
      const projectRef = doc(db, 'projects', project.id);
      const userRef = doc(db, 'users', user.uid);

      await runTransaction(db, async (transaction) => {
        // Remove user from project's member list
        transaction.update(projectRef, {
          memberUids: arrayRemove(user.uid),
        });
        // Remove project from user's project list
        transaction.update(userRef, {
          projectIds: arrayRemove(project.id),
        });
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: 'Failed to leave the project on the server. Please reload if the project reappears.',
      });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to leave this project?</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to leave the project{' '}
            <span className="font-bold">"{project?.name}"</span>. You will lose access to all of its data. You can only rejoin if invited again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLeaving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLeave}
            disabled={isLeaving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLeaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Yes, leave project
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
