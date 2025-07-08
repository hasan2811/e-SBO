
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
import type { Project, UserProfile } from '@/lib/types';
import { Loader2, UserX } from 'lucide-react';
import { doc, arrayRemove, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useProjects } from '@/hooks/use-projects';

interface RemoveMemberDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  member: UserProfile | null;
  onSuccess?: (removedMemberId: string) => void;
}

export function RemoveMemberDialog({
  isOpen,
  onOpenChange,
  project,
  member,
  onSuccess,
}: RemoveMemberDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { updateProject } = useProjects();
  const [isRemoving, setIsRemoving] = React.useState(false);

  const handleRemove = () => {
    if (!user || !project || !member) {
      toast({ variant: 'destructive', title: 'Error', description: 'User, project, or member data not found.' });
      return;
    }
    if (member.uid === project.ownerUid) {
      toast({ variant: 'destructive', title: 'Action Denied', description: 'The project owner cannot be removed.'});
      return;
    }
    
    setIsRemoving(true);

    const updatedUids = project.memberUids.filter(uid => uid !== member.uid);

    // 1. Optimistic UI update on global context
    updateProject(project.id, { memberUids: updatedUids });
    toast({ title: 'Member Removed', description: `${member.displayName} has been removed from the project.` });
    onSuccess?.(member.uid); // Closes the dialog via parent state change

    // 2. Background DB operation
    const removeFromDb = async () => {
      try {
        const projectRef = doc(db, 'projects', project.id);
        const memberUserRef = doc(db, 'users', member.uid);

        await runTransaction(db, async (transaction) => {
          transaction.update(projectRef, { memberUids: arrayRemove(member.uid) });
          transaction.update(memberUserRef, { projectIds: arrayRemove(project.id) });
        });
      } catch (error) {
        console.error("Failed to remove member from server:", error);
        // If server fails, the live listener will eventually revert the optimistic update.
        toast({
          variant: 'destructive',
          title: 'Sync Failed',
          description: `Failed to remove ${member.displayName} from the server. Please reload.`,
        });
      }
    };

    removeFromDb();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to remove this member?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will remove{' '}
            <span className="font-bold">"{member?.displayName}"</span> from the project{' '}
            <span className="font-bold">"{project?.name}"</span>. They will lose all access.
            This can be undone by adding them again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            disabled={isRemoving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRemoving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserX className="mr-2 h-4 w-4" />
            )}
            Yes, remove member
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
