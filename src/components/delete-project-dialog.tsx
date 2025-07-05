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
import type { Project, AllItems } from '@/lib/types';
import { Loader2, Trash2, ArrowRightLeft } from 'lucide-react';
import { doc, runTransaction, arrayRemove, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, deleteObject } from 'firebase/storage';

interface DeleteProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSuccess?: () => void;
}

export function DeleteProjectDialog({
  isOpen,
  onOpenChange,
  project,
  onSuccess,
}: DeleteProjectDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = React.useState(false);

  if (!project) return null;

  // Determine the action based on whether other members exist.
  const hasOtherMembers = project.memberUids.filter(uid => uid !== user?.uid).length > 0;

  const handleConfirm = async () => {
    if (!user || !project) {
      toast({ variant: 'destructive', title: 'Error', description: 'User or project not found.' });
      return;
    }

    setIsProcessing(true);

    if (hasOtherMembers) {
      // --- Logic for Transferring Ownership ---
      try {
        const projectRef = doc(db, 'projects', project.id);
        const oldOwnerUserRef = doc(db, 'users', user.uid);
        
        const otherMembers = project.memberUids.filter(uid => uid !== user.uid);
        if (otherMembers.length === 0) {
          throw new Error("No other members to transfer ownership to.");
        }
        const newOwnerUid = otherMembers[0]; // Transfer to the "first" member in the list

        await runTransaction(db, async (transaction) => {
            const projectSnap = await transaction.get(projectRef);
            if (!projectSnap.exists() || projectSnap.data()?.ownerUid !== user.uid) {
                throw new Error("Only the project owner can perform this action.");
            }
            // 1. Update the project document with the new owner
            transaction.update(projectRef, {
                ownerUid: newOwnerUid
            });
            // 2. Remove the old owner from the members list
            transaction.update(projectRef, {
                memberUids: arrayRemove(user.uid)
            });
            // 3. Remove the project from the old owner's profile
            transaction.update(oldOwnerUserRef, {
                projectIds: arrayRemove(project.id)
            });
        });

        toast({
          title: 'Kepemilikan Dialihkan',
          description: `Anda telah meninggalkan proyek "${project.name}" dan kepemilikan telah dialihkan.`,
        });
        onSuccess?.();
        onOpenChange(false);
      } catch (error) {
        console.error("Error transferring project ownership:", error);
        toast({
          variant: 'destructive',
          title: 'Pengalihan Gagal',
          description: 'Terjadi kesalahan tak terduga saat mengalihkan kepemilikan.',
        });
      } finally {
        setIsProcessing(false);
      }
    } else {
      // --- Logic for Complete Deletion ---
      try {
        const projectRef = doc(db, 'projects', project.id);
        const batch = writeBatch(db);
        const storageDeletePromises: Promise<any>[] = [];

        // 1. Find and queue deletion for all associated items and their storage files
        const itemTypes = ['observations', 'inspections', 'ptws'];
        for (const itemType of itemTypes) {
          const q = query(collection(db, itemType), where("projectId", "==", project.id));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            const item = doc.data() as AllItems;
            batch.delete(doc.ref); // Queue doc for deletion
            
            // Queue storage files for deletion
            if ((item.itemType === 'observation' || item.itemType === 'inspection')) {
                if(item.photoUrl) storageDeletePromises.push(deleteObject(ref(storage, item.photoUrl)).catch(e => console.error(e)));
                if ('actionTakenPhotoUrl' in item && item.actionTakenPhotoUrl) {
                    storageDeletePromises.push(deleteObject(ref(storage, item.actionTakenPhotoUrl)).catch(e => console.error(e)));
                }
            } else if (item.itemType === 'ptw' && item.jsaPdfUrl) {
                storageDeletePromises.push(deleteObject(ref(storage, item.jsaPdfUrl)).catch(e => console.error(e)));
            }
          });
        }
        
        // 2. Queue deletion for the project document itself
        batch.delete(projectRef);
        
        // 3. Remove project from owner's profile
        const userRef = doc(db, 'users', user.uid);
        batch.update(userRef, { projectIds: arrayRemove(project.id) });

        // 4. Commit Firestore batch and then delete from storage
        await batch.commit();
        await Promise.all(storageDeletePromises);

        toast({
          title: 'Proyek Dihapus',
          description: `Proyek "${project.name}" dan semua datanya telah dihapus secara permanen.`,
        });
        onSuccess?.();
        onOpenChange(false);
      } catch (error) {
        console.error("Error deleting project:", error);
        toast({
          variant: 'destructive',
          title: 'Penghapusan Gagal',
          description: 'Terjadi kesalahan tak terduga saat menghapus proyek.',
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const dialogContent = {
    title: hasOtherMembers ? 'Alihkan Kepemilikan & Keluar?' : 'Hapus Proyek Secara Permanen?',
    description: hasOtherMembers
      ? `Proyek ini memiliki anggota lain. Alih-alih menghapus, kepemilikan akan dialihkan ke anggota berikutnya, dan Anda akan meninggalkan proyek. Semua data proyek akan tetap ada. Tindakan ini tidak dapat dibatalkan.`
      : `Anda adalah anggota terakhir dari proyek ini. Tindakan ini akan secara permanen menghapus proyek "${project.name}" DAN SEMUA datanya (observasi, inspeksi, dll.) dari Firestore dan Storage. Tindakan ini tidak dapat dibatalkan.`,
    buttonText: hasOtherMembers ? 'Ya, Keluar & Alihkan' : 'Ya, Hapus Semuanya',
    icon: hasOtherMembers ? <ArrowRightLeft className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />,
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dialogContent.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isProcessing}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              dialogContent.icon
            )}
            {dialogContent.buttonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
