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
import { useAuth } from '@/hooks/use-auth';
import type { Project } from '@/lib/types';
import { Loader2, LogOut } from 'lucide-react';
import { doc, updateDoc, arrayRemove, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';


interface LeaveProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSuccess?: (projectId: string) => void;
}

export function LeaveProjectDialog({
  isOpen,
  onOpenChange,
  project,
  onSuccess,
}: LeaveProjectDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLeaving, setIsLeaving] = React.useState(false);

  const handleLeave = async () => {
    if (!user || !project) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User or project not found.',
      });
      return;
    }

    setIsLeaving(true);
    try {
      const projectRef = doc(db, 'projects', project.id);
      const userRef = doc(db, 'users', user.uid);

      await runTransaction(db, async (transaction) => {
        // Remove user from project's member list
        transaction.update(projectRef, {
          memberUids: arrayRemove(user.uid),
        });
        // Remove project from user's project list
        transaction.update(userRef, {
          projectIds: arrayRemove(project.id),
        });
      });
      
      toast({
        title: 'Berhasil Meninggalkan Proyek',
        description: `Anda telah berhasil meninggalkan proyek "${project.name}".`,
      });
      
      // Signal success to the parent component.
      // The parent is responsible for closing the dialog by changing its state.
      // No need to call setIsLeaving(false) here because the component will unmount.
      onSuccess?.(project.id);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Meninggalkan Proyek',
        description: 'Terjadi kesalahan tak terduga saat meninggalkan proyek.',
      });
      // ONLY set loading to false on error, so the user can try again.
      setIsLeaving(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Anda yakin ingin meninggalkan proyek ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Anda akan meninggalkan proyek{' '}
            <span className="font-bold">"{project?.name}"</span>. Anda akan kehilangan akses ke semua datanya. Anda hanya bisa bergabung kembali jika diundang lagi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLeaving}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLeave}
            disabled={isLeaving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLeaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Ya, tinggalkan proyek
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
