
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
import type { Ptw } from '@/lib/types';
import { Loader2, Trash2 } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, deleteObject } from 'firebase/storage';
import { ObservationContext } from '@/contexts/observation-context';

interface DeletePtwDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  ptw: Ptw;
  onSuccess: () => void;
}

export function DeletePtwDialog({
  isOpen,
  onOpenChange,
  ptw,
  onSuccess,
}: DeletePtwDialogProps) {
  const { toast } = useToast();
  const { removeItem } = React.useContext(ObservationContext)!;
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = () => {
    setIsDeleting(true);

    // 1. Optimistic UI Update
    removeItem(ptw.id, 'ptw');
    toast({
        title: 'PTW Deleted',
        description: `Permit to Work "${ptw.referenceId}" is being removed.`,
    });
    
    // Call onSuccess to close the DetailSheet and the dialog itself
    onSuccess();
    
    // 2. Background Deletion
    const deleteInBackground = async () => {
      try {
        const docRef = doc(db, 'ptws', ptw.id);
        await deleteDoc(docRef);

        const storagePromises = [];
        if (ptw.jsaPdfStoragePath) {
          storagePromises.push(deleteObject(ref(storage, ptw.jsaPdfStoragePath)).catch(err => console.error(err)));
        }
        if (ptw.stampedPdfStoragePath) {
          storagePromises.push(deleteObject(ref(storage, ptw.stampedPdfStoragePath)).catch(err => console.error(err)));
        }
        await Promise.all(storagePromises);

      } catch (error) {
        console.error("Failed to delete PTW from server:", error);
        toast({
          variant: 'destructive',
          title: 'Sync Failed',
          description: 'The PTW failed to delete from the server. Please refresh the page.',
        });
      }
    };

    deleteInBackground();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to delete this?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. It will permanently delete this Permit to Work, including the associated JSA document.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
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
            Yes, delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
