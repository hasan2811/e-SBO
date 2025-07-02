
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
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';


interface LeaveProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSuccess?: () => void;
}

export function LeaveProjectDialog({
  isOpen,
  onOpenChange,
  project,
  onSuccess,
}: LeaveProjectDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
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
    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, {
        memberUids: arrayRemove(user.uid),
      });

      toast({
        title: 'You Have Left the Project',
        description: `You have successfully left "${project.name}".`,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred while leaving the project.',
      });
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to leave this project?</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to leave the project{' '}
            <span className="font-bold">"{project?.name}"</span>. You will lose access
            to all of its data. You can only rejoin if you are invited again.
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
