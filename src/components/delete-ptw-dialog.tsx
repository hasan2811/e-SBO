
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
import { useObservations } from '@/hooks/use-observations';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, deleteObject } from 'firebase/storage';

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
  const { removeItem } = useObservations(null, 'ptw');
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = () => {
    setIsDeleting(true);

    // 1. Optimistic UI update
    removeItem(ptw.id);
    toast({
      title: 'Izin Kerja Dihapus',
      description: `Izin kerja "${ptw.referenceId}" telah berhasil dihapus.`,
    });
    onSuccess();
    onOpenChange(false);
    
    // 2. Background deletion
    const deleteInBackground = async () => {
        try {
            const docRef = doc(db, 'ptws', ptw.id);
            await deleteDoc(docRef);

            if (ptw.jsaPdfStoragePath) {
                await deleteObject(ref(storage, ptw.jsaPdfStoragePath)).catch(err => console.error(err));
            }
            if (ptw.stampedPdfStoragePath) {
                await deleteObject(ref(storage, ptw.stampedPdfStoragePath)).catch(err => console.error(err));
            }
        } catch (error) {
            console.error("Gagal menghapus PTW dari server:", error);
            toast({
                variant: 'destructive',
                title: 'Sinkronisasi Gagal',
                description: 'Izin kerja gagal dihapus dari server. Harap segarkan halaman.',
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
            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus Izin Kerja ini secara permanen, termasuk dokumen JSA terkait.
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
