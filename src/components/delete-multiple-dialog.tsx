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
import { deleteMultipleItems } from '@/lib/actions/item-actions';
import { useToast } from '@/hooks/use-toast';
import { AllItems } from '@/lib/types';


interface DeleteMultipleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  itemsToDelete: AllItems[];
  onSuccess?: () => void;
}

export function DeleteMultipleDialog({
  isOpen,
  onOpenChange,
  itemsToDelete,
  onSuccess,
}: DeleteMultipleDialogProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    if (itemsToDelete.length === 0) return;
    setIsDeleting(true);
    try {
        await deleteMultipleItems(itemsToDelete);
        toast({ title: 'Berhasil Dihapus', description: `${itemsToDelete.length} item telah berhasil dihapus.` });
        onSuccess?.();
        onOpenChange(false);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal Menghapus', description: 'Terjadi kesalahan saat menghapus item.' });
    } finally {
        setIsDeleting(false);
    }
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
            onClick={handleConfirm}
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
