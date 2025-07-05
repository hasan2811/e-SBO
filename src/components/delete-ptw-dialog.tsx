
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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const docRef = doc(db, 'ptws', ptw.id);
      await deleteDoc(docRef);

      // Delete original JSA PDF using its storage path
      if (ptw.jsaPdfStoragePath) {
        const fileRef = ref(storage, ptw.jsaPdfStoragePath);
        await deleteObject(fileRef).catch(err => console.error("Non-blocking: Failed to delete JSA PDF", err));
      }
      
      // Delete stamped JSA PDF if it exists, using its storage path
      if (ptw.stampedPdfStoragePath) {
        const stampedFileRef = ref(storage, ptw.stampedPdfStoragePath);
        await deleteObject(stampedFileRef).catch(err => console.error("Non-blocking: Failed to delete stamped JSA PDF", err));
      }

      removeItem(ptw.id);
      toast({
        title: 'Berhasil Dihapus',
        description: `Izin Kerja telah berhasil dihapus.`,
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
