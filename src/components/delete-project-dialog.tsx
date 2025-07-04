
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
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { Project } from '@/lib/types';
import { Loader2, Trash2 } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface DeleteProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSuccess?: () => void;
}

export function DeleteProjectDialog({
  isOpen,
  onOpenChange,
  project,
  onSuccess,
}: DeleteProjectDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!user || !project) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User or project not found.',
      });
      return;
    }

    setIsDeleting(true);
    try {
      const projectRef = doc(db, 'projects', project.id);
      
      // Verify ownership before proceeding
      const projectSnap = await getDoc(projectRef);
      if (!projectSnap.exists() || projectSnap.data()?.ownerUid !== user.uid) {
        toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only the project owner can delete the project.' });
        setIsDeleting(false);
        return;
      }
      
      const batch = writeBatch(db);

      // 1. Find and queue deletion for all associated items (observations, inspections, ptws)
      const itemTypes = ['observations', 'inspections', 'ptws'];
      for (const itemType of itemTypes) {
        const q = query(collection(db, itemType), where("projectId", "==", project.id));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
      }
      
      // 2. Queue deletion for the project document itself
      batch.delete(projectRef);
      
      // Note: We are not removing the projectId from users' profiles here.
      // This would require many individual reads and writes, which is not suitable for a client-side batch operation.
      // Leaving the dangling projectId is a safe trade-off as it won't break the app.

      // Commit the batch
      await batch.commit();

      toast({
        title: 'Project Deleted',
        description: `Project "${project.name}" and all its contents have been successfully deleted.`,
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred while deleting the project and its contents.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the project{' '}
            <span className="font-bold">"{project?.name}"</span> AND ALL of its associated reports (observations, inspections, and PTWs).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Yes, delete everything
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
