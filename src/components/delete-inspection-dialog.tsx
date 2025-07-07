
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

    // 1. Optimistic UI update
    removeItem(inspection.id, 'inspection');
    toast({
      title: 'Laporan Dihapus',
      description: `Laporan inspeksi "${inspection.referenceId}" telah dihapus dari tampilan.`,
    });
    onSuccess();
    onOpenChange(false);

    // 2. Background deletion
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
        console.error("Gagal menghapus inspeksi dari server:", error);
        toast({
          variant: 'destructive',
          title: 'Sinkronisasi Gagal',
          description: 'Laporan gagal dihapus dari server. Harap segarkan halaman.',
        });
        // In a more robust app, we might re-add the item to the context here.
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
            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus laporan inspeksi ini secara permanen, termasuk fotonya.
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
