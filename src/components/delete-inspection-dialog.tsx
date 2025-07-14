
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
import type { Inspection } from '@/lib/types';
import { Loader2, Trash2 } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, deleteObject } from 'firebase/storage';
import { ObservationContext } from '@/contexts/observation-context';

interface DeleteInspectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  inspection: Inspection;
  onSuccess: () => void;
}

export function DeleteInspectionDialog({
  isOpen,
  onOpenChange,
  inspection,
  onSuccess,
}: DeleteInspectionDialogProps) {
  const { toast } = useToast();
  const { removeItem } = React.useContext(ObservationContext)!;
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = () => {
    setIsDeleting(true);

    // 1. Optimistic UI Update
    removeItem(inspection.id, 'inspection');
    toast({
      title: 'Report Deleted',
      description: `Inspection report "${inspection.referenceId}" is being removed.`,
    });
    
    // Call onSuccess to close the DetailSheet and the dialog itself
    onSuccess();

    // 2. Background Deletion
    const deleteInBackground = async () => {
      try {
        const docRef = doc(db, 'inspections', inspection.id);
        await deleteDoc(docRef);

        const storagePromises = [];
        if (inspection.photoStoragePath) {
          storagePromises.push(deleteObject(ref(storage, inspection.photoStoragePath)).catch(e => console.error(e)));
        }
        if (inspection.actionTakenPhotoStoragePath) {
          storagePromises.push(deleteObject(ref(storage, inspection.actionTakenPhotoStoragePath)).catch(e => console.error(e)));
        }
        await Promise.all(storagePromises);

      } catch (error) {
        console.error("Failed to delete inspection from server:", error);
        toast({
          variant: 'destructive',
          title: 'Sync Failed',
          description: 'The report failed to delete from the server. Please refresh the page.',
        });
        // Here you might want to re-add the item to the context if the deletion fails,
        // but for now, we rely on the live listener to correct the state.
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
            This action cannot be undone. It will permanently delete this inspection report, including its photos.
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
