
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
import type { Project, AllItems, UserProfile } from '@/lib/types';
import { Loader2, Trash2 } from 'lucide-react';
import { doc, runTransaction, arrayRemove, collection, query, where, getDocs, writeBatch, getDoc } from 'firebase/firestore';
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

  const handleConfirm = async () => {
    if (!user || !project) {
      toast({ variant: 'destructive', title: 'Error', description: 'User or project not found.' });
      return;
    }

    setIsProcessing(true);

    try {
      const projectRef = doc(db, 'projects', project.id);
      const projectSnap = await getDoc(projectRef);
      if (!projectSnap.exists()) {
        throw new Error("Project does not exist anymore.");
      }
      
      const currentProjectData = projectSnap.data() as Project;
      const memberUids = currentProjectData.memberUids || [];

      const batch = writeBatch(db);
      const storageDeletePromises: Promise<any>[] = [];

      // 1. Find and queue deletion for all associated items and their storage files
      const itemTypes = ['observations', 'inspections', 'ptws'];
      for (const itemType of itemTypes) {
        const q = query(collection(db, itemType), where("projectId", "==", project.id));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((itemDoc) => {
          const item = itemDoc.data() as AllItems;
          batch.delete(itemDoc.ref);
          
          if (item.itemType === 'observation' || item.itemType === 'inspection') {
            if('photoStoragePath' in item && item.photoStoragePath) {
              storageDeletePromises.push(deleteObject(ref(storage, item.photoStoragePath)).catch(e => console.error(`Failed to delete ${item.photoStoragePath}:`, e)));
            }
            if ('actionTakenPhotoStoragePath' in item && item.actionTakenPhotoStoragePath) {
              storageDeletePromises.push(deleteObject(ref(storage, item.actionTakenPhotoStoragePath)).catch(e => console.error(`Failed to delete ${item.actionTakenPhotoStoragePath}:`, e)));
            }
          } else if (item.itemType === 'ptw') {
            if('jsaPdfStoragePath' in item && item.jsaPdfStoragePath) {
              storageDeletePromises.push(deleteObject(ref(storage, item.jsaPdfStoragePath)).catch(e => console.error(`Failed to delete ${item.jsaPdfStoragePath}:`, e)));
            }
            if('stampedPdfStoragePath' in item && item.stampedPdfStoragePath) {
              storageDeletePromises.push(deleteObject(ref(storage, item.stampedPdfStoragePath)).catch(e => console.error(`Failed to delete ${item.stampedPdfStoragePath}:`, e)));
            }
          }
        });
      }
      
      // 2. Queue updates to remove the project from every member's profile
      for (const uid of memberUids) {
        const userRef = doc(db, 'users', uid);
        batch.update(userRef, { projectIds: arrayRemove(project.id) });
      }

      // 3. Queue deletion for the project document itself
      batch.delete(projectRef);
      
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
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Proyek Secara Permanen?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini akan secara permanen menghapus proyek "{project.name}" dan SEMUA datanya untuk SEMUA anggota. Tindakan ini tidak dapat dibatalkan.
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
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Ya, Hapus Semuanya
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
