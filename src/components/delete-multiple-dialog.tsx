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

interface DeleteMultipleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  itemCount: number;
  onConfirm: () => Promise<void>;
}

export function DeleteMultipleDialog({
  isOpen,
  onOpenChange,
  itemCount,
  onConfirm,
}: DeleteMultipleDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirmClick = async () => {
    if (itemCount === 0) return;
    
    setIsDeleting(true);
    try {
      await onConfirm(); // The parent component handles the logic and toast
      onOpenChange(false); // Close dialog on success
    } catch (error) {
      // Error is caught and toasted by the parent component.
      // We just need to stop the loading spinner.
      console.error("Deletion failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (itemCount === 0) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Anda yakin ingin menghapus item ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus{' '}
            <span className="font-bold">{itemCount}</span> item yang dipilih secara permanen, termasuk semua data terkait seperti foto.
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
