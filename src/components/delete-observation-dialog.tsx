
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
  const { removeItem } = useObservations(null, 'observation'); // Hook instance for actions
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const docRef = doc(db, 'observations', observation.id);
      await deleteDoc(docRef);

      // Delete associated photos using their storage paths for reliability
      if (observation.photoStoragePath) {
        const photoRef = ref(storage, observation.photoStoragePath);
        await deleteObject(photoRef).catch(err => console.error("Non-blocking: Failed to delete main photo", err));
      }
      if (observation.actionTakenPhotoStoragePath) {
          const actionPhotoRef = ref(storage, observation.actionTakenPhotoStoragePath);
          await deleteObject(actionPhotoRef).catch(err => console.error("Non-blocking: Failed to delete action photo", err));
      }

      // Optimistically remove from UI
      removeItem(observation.id);
      
      toast({
        title: 'Berhasil Dihapus',
        description: `Laporan observasi telah berhasil dihapus.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan tak terduga.',
      });
    } finally {
        setIsDeleting(false);
    }
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
