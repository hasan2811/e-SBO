
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
import { Loader2, Trash2 } from 'lucide-react';
import type { AllItems } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { writeBatch, doc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, deleteObject } from 'firebase/storage';
import { ObservationContext } from '@/contexts/observation-context';

interface DeleteMultipleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  itemsToDelete: AllItems[];
  onSuccess: () => void;
}

export function DeleteMultipleDialog({
  isOpen,
  onOpenChange,
  itemsToDelete,
  onSuccess,
}: DeleteMultipleDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { toast } = useToast();
  const { removeItem } = React.useContext(ObservationContext)!;

  const handleConfirmClick = () => {
    if (itemsToDelete.length === 0) return;
    
    setIsDeleting(true);
    const count = itemsToDelete.length;

    // 1. Optimistic UI Update
    itemsToDelete.forEach(item => removeItem(item.id, item.itemType));
    toast({
        title: 'Successfully Deleted',
        description: `${count} item(s) have been removed from view.`,
    });
    onSuccess();
    onOpenChange(false);
    
    // 2. Background DB & Storage Deletion
    const deleteInBackground = async () => {
        try {
            const batch = writeBatch(db);
            const storageDeletePromises: Promise<any>[] = [];

            for (const item of itemsToDelete) {
                const collectionName = `${item.itemType}s`;
                const docRef = doc(db, collectionName, item.id);
                batch.delete(docRef);

                if (item.itemType === 'observation' || item.itemType === 'inspection') {
                if('photoStoragePath' in item && item.photoStoragePath) {
                    storageDeletePromises.push(deleteObject(ref(storage, item.photoStoragePath)).catch(e => console.error(e)));
                }
                if ('actionTakenPhotoStoragePath' in item && item.actionTakenPhotoStoragePath) {
                    storageDeletePromises.push(deleteObject(ref(storage, item.actionTakenPhotoStoragePath)).catch(e => console.error(e)));
                }
                } else if (item.itemType === 'ptw') {
                    if('jsaPdfStoragePath' in item && item.jsaPdfStoragePath) {
                        storageDeletePromises.push(deleteObject(ref(storage, item.jsaPdfStoragePath)).catch(e => console.error(e)));
                    }
                    if('stampedPdfStoragePath' in item && item.stampedPdfStoragePath) {
                        storageDeletePromises.push(deleteObject(ref(storage, item.stampedPdfStoragePath)).catch(e => console.error(e)));
                    }
                }
            }

            await batch.commit();
            await Promise.all(storageDeletePromises);
        } catch (error) {
            console.error("Failed to delete multiple items from server:", error);
            toast({
                variant: 'destructive',
                title: 'Sync Failed',
                description: 'Some items failed to delete from the server. Please refresh the page.',
            });
        }
    };
    
    deleteInBackground();
  };

  if (itemsToDelete.length === 0) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to delete these items?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the selected{' '}
            <span className="font-bold">{itemsToDelete.length}</span> item(s), including all related data like photos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmClick}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Yes, delete all
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
