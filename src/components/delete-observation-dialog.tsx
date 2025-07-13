
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
import type { Observation } from '@/lib/types';
import { Loader2, Trash2 } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, deleteObject } from 'firebase/storage';
import { ObservationContext } from '@/contexts/observation-context';

interface DeleteObservationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  observation: Observation;
  onSuccess: () => void;
}

export function DeleteObservationDialog({
  isOpen,
  onOpenChange,
  observation,
  onSuccess,
}: DeleteObservationDialogProps) {
  const { toast } = useToast();
  const { removeItem } = React.useContext(ObservationContext)!;
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = () => {
    setIsDeleting(true);

    // 1. Optimistic UI Update
    removeItem(observation.id, 'observation');
    toast({
        title: 'Report Deleted',
        description: `Observation report "${observation.referenceId}" is being removed.`,
    });
    onSuccess();


    // 2. Background Deletion
    const deleteInBackground = async () => {
      try {
        const docRef = doc(db, 'observations', observation.id);
        await deleteDoc(docRef);

        const storagePromises = [];
        if (observation.photoStoragePath) {
          storagePromises.push(deleteObject(ref(storage, observation.photoStoragePath)).catch(err => console.error(err)));
        }
        if (observation.actionTakenPhotoStoragePath) {
          storagePromises.push(deleteObject(ref(storage, observation.actionTakenPhotoStoragePath)).catch(err => console.error(err)));
        }
        await Promise.all(storagePromises);
        
      } catch (error) {
        console.error("Failed to delete observation from server:", error);
        toast({
          variant: 'destructive',
          title: 'Sync Failed',
          description: 'The report failed to delete from the server. Please refresh the page.',
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
            This action cannot be undone. This will permanently delete this observation report, including its photos.
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
            Yes, delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
