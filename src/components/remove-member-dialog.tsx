

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
import type { Project, UserProfile } from '@/lib/types';
import { Loader2, UserX } from 'lucide-react';
import { doc, getDoc, updateDoc, arrayRemove, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface RemoveMemberDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  member: UserProfile | null;
}

export function RemoveMemberDialog({
  isOpen,
  onOpenChange,
  project,
  member,
}: RemoveMemberDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRemoving, setIsRemoving] = React.useState(false);

  const handleRemove = async () => {
    if (!user || !project || !member) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Data pengguna, proyek, atau anggota tidak ditemukan.',
      });
      return;
    }

    if (member.uid === project.ownerUid) {
      toast({ variant: 'destructive', title: 'Tindakan Ditolak', description: 'Pemilik proyek tidak dapat dikeluarkan.'});
      return;
    }
    
    setIsRemoving(true);
    try {
      const projectRef = doc(db, 'projects', project.id);
      const memberUserRef = doc(db, 'users', member.uid);

      await runTransaction(db, async (transaction) => {
        const projectSnap = await transaction.get(projectRef);
        if (!projectSnap.exists() || projectSnap.data()?.ownerUid !== user.uid) {
          throw new Error('Hanya pemilik proyek yang dapat mengeluarkan anggota.');
        }
        
        // Remove member from project's member list
        transaction.update(projectRef, {
          memberUids: arrayRemove(member.uid),
        });

        // Remove project from member's project list
        transaction.update(memberUserRef, {
          projectIds: arrayRemove(project.id)
        });
      });

      toast({ title: 'Anggota Dikeluarkan', description: 'Anggota telah berhasil dikeluarkan dari proyek.' });
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tak terduga saat mengeluarkan anggota.';
      toast({
        variant: 'destructive',
        title: 'Gagal Mengeluarkan Anggota',
        description: errorMessage,
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Anda yakin ingin mengeluarkan anggota ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini akan mengeluarkan{' '}
            <span className="font-bold">"{member?.displayName}"</span> dari proyek{' '}
            <span className="font-bold">"{project?.name}"</span>. Mereka akan kehilangan semua akses.
            Tindakan ini dapat dibatalkan dengan mengundang mereka lagi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            disabled={isRemoving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRemoving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserX className="mr-2 h-4 w-4" />
            )}
            Ya, keluarkan anggota
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
