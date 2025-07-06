
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
import { useObservations } from '@/hooks/use-observations';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, deleteObject } from 'firebase/storage';

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
  const { removeItem } = useObservations(null, 'observation');
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = () => {
    setIsDeleting(true);

    // 1. Optimistic UI update
    removeItem(observation.id);
    toast({
      title: 'Laporan Dihapus',
      description: `Laporan observasi "${observation.referenceId}" telah dihapus.`,
    });
    onSuccess();
    onOpenChange(false);

    // 2. Background deletion
    const deleteInBackground = async () => {
      try {
        const docRef = doc(db, 'observations', observation.id);
        await deleteDoc(docRef);

        if (observation.photoStoragePath) {
          await deleteObject(ref(storage, observation.photoStoragePath)).catch(err => console.error(err));
        }
        if (observation.actionTakenPhotoStoragePath) {
          await deleteObject(ref(storage, observation.actionTakenPhotoStoragePath)).catch(err => console.error(err));
        }
      } catch (error) {
        console.error("Gagal menghapus observasi dari server:", error);
        toast({
          variant: 'destructive',
          title: 'Sinkronisasi Gagal',
          description: 'Laporan gagal dihapus dari server. Harap segarkan halaman.',
        });
      }
    };
    
    deleteInBackground();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Anda yakin ingin menghapus ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus laporan observasi ini secara permanen, termasuk fotonya.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
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
            Ya, hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
