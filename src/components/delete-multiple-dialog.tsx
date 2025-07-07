
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
        title: 'Berhasil Dihapus',
        description: `${count} item telah dihapus dari tampilan.`,
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
            console.error("Gagal menghapus beberapa item dari server:", error);
            toast({
                variant: 'destructive',
                title: 'Sinkronisasi Gagal',
                description: 'Beberapa item gagal dihapus dari server. Harap segarkan halaman.',
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
          <AlertDialogTitle>Anda yakin ingin menghapus item ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus{' '}
            <span className="font-bold">{itemsToDelete.length}</span> item yang dipilih secara permanen, termasuk semua data terkait seperti foto.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
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
            Ya, hapus semua
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
