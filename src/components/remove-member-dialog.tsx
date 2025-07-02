

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
import { doc, getDoc, updateDoc, arrayRemove, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface RemoveMemberDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  member: UserProfile | null;
}

export function RemoveMemberDialog({
  isOpen,
  onOpenChange,
  project,
  member,
}: RemoveMemberDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRemoving, setIsRemoving] = React.useState(false);

  const handleRemove = async () => {
    if (!user || !project || !member) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User, project, or member data not found.',
      });
      return;
    }

    if (member.uid === project.ownerUid) {
      toast({ variant: 'destructive', title: 'Action Not Allowed', description: 'The project owner cannot be removed.'});
      return;
    }
    
    setIsRemoving(true);
    try {
      const projectRef = doc(db, 'projects', project.id);
      const memberUserRef = doc(db, 'users', member.uid);

      await runTransaction(db, async (transaction) => {
        const projectSnap = await transaction.get(projectRef);
        if (!projectSnap.exists() || projectSnap.data()?.ownerUid !== user.uid) {
          throw new Error('Only the project owner can remove members.');
        }
        
        // Remove member from project's member list
        transaction.update(projectRef, {
          memberUids: arrayRemove(member.uid),
        });

        // Remove project from member's project list
        transaction.update(memberUserRef, {
          projectIds: arrayRemove(project.id)
        });
      });

      toast({ title: 'Member Removed', description: 'The member has been removed from the project.' });
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while removing the member.';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsRemoving(false);
    }
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
            This action can be reversed by inviting them again.
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
