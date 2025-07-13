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
import { Loader2, Trash2 } from 'lucide-react';
import { doc, getDoc, arrayRemove, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, deleteObject } from 'firebase/storage';
import { useProjects } from '@/hooks/use-projects';

interface DeleteProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSuccess?: (projectId: string) => void;
}

export function DeleteProjectDialog({
  isOpen,
  onOpenChange,
  project,
  onSuccess,
}: DeleteProjectDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { removeProject } = useProjects();
  const [isProcessing, setIsProcessing] = React.useState(false);

  if (!project) return null;

  const handleConfirm = () => {
    if (!user || !project) {
      toast({ variant: 'destructive', title: 'Error', description: 'User or project not found.' });
      return;
    }

    setIsProcessing(true);
    
    onSuccess?.(project.id);

    const deleteInBackground = async () => {
        try {
            const projectRef = doc(db, 'projects', project.id);
            const projectSnap = await getDoc(projectRef);
            if (!projectSnap.exists()) {
                console.warn("Project already deleted from server.");
                return;
            }
            
            removeProject(project.id);
            
            const currentProjectData = projectSnap.data() as Project;
            const memberUids = currentProjectData.memberUids || [];
            const batch = writeBatch(db);
            const storageDeletePromises: Promise<any>[] = [];

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
            
            for (const uid of memberUids) {
                const userRef = doc(db, 'users', uid);
                batch.update(userRef, { projectIds: arrayRemove(project.id) });
            }

            batch.delete(projectRef);
            
            await batch.commit();
            await Promise.all(storageDeletePromises);
            toast({
              title: 'Project Deletion Complete',
              description: `Project "${project.name}" has been fully deleted.`,
            });
        
        } catch (error) {
            console.error("Error deleting project from server:", error);
            toast({
                variant: 'destructive',
                title: 'Sync Failed',
                description: 'Failed to delete project from the server. Please reload if the project reappears.',
            });
        } finally {
            setIsProcessing(false);
            onOpenChange(false);
        }
    };
    
    deleteInBackground();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permanently Delete Project?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the "{project.name}" project and ALL of its data for ALL members. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
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
            Yes, Delete Everything
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
