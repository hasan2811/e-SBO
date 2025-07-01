
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, limit, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Project, UserProfile } from '@/lib/types';

/**
 * Server action to create a new project.
 * This is now simplified and more secure. It only takes the project name
 * and automatically sets the creator as the sole owner and member.
 * It also enforces the "one project per user" rule.
 * @param owner - The user object of the project creator.
 * @param projectName - The name of the new project.
 * @returns An object with success status and a message.
 */
export async function createProject(
  owner: Pick<UserProfile, 'uid' | 'email' | 'displayName'>,
  projectName: string
): Promise<{ success: boolean; message: string }> {
  if (!owner || !owner.uid) {
    return { success: false, message: 'Authentication required to create a project.' };
  }
  
  try {
    const projectCollectionRef = collection(db, 'projects');

    // Enforce the "one project per user" rule.
    const existingProjectQuery = query(
        projectCollectionRef, 
        where('memberUids', 'array-contains', owner.uid),
        limit(1)
    );
    const existingProjectSnapshot = await getDocs(existingProjectQuery);
    
    if (!existingProjectSnapshot.empty) {
        return { success: false, message: 'Action failed: A user can only be a member of one project at a time.' };
    }

    // The new project document. memberUids now only contains the creator's UID.
    await addDoc(projectCollectionRef, {
      name: projectName,
      ownerUid: owner.uid,
      memberUids: [owner.uid], 
      createdAt: new Date().toISOString(),
    });
    
    // Revalidate paths to ensure new project data is fetched on relevant pages.
    revalidatePath('/tasks');
    revalidatePath('/beranda');

    return { success: true, message: `Project "${projectName}" was created successfully!` };
  } catch (error) {
    console.error('Error creating project:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    
    if (errorMessage.toLowerCase().includes('permission-denied')) {
        return { success: false, message: 'Permission denied. Please check your Firestore security rules to allow project creation.' };
    }
    
    return { success: false, message: `Project creation failed: ${errorMessage}` };
  }
}


/**
 * Server action to delete a project.
 * Only the project owner can perform this action.
 * @param projectId The ID of the project to delete.
 * @param userId The UID of the user requesting the deletion.
 * @returns An object with success status and a message.
 */
export async function deleteProject(
  projectId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  if (!projectId || !userId) {
    return { success: false, message: 'Project ID and User ID are required.' };
  }

  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) {
      return { success: false, message: 'Project not found.' };
    }

    const project = projectSnap.data() as Project;

    if (project.ownerUid !== userId) {
      return { success: false, message: 'Permission denied. Only the project owner can delete this project.' };
    }

    // TODO: In a real-world scenario, you would also delete all sub-collections
    // (observations, inspections, ptws) associated with this project.
    // This typically requires a Cloud Function for reliable cascading deletes.
    // For this implementation, we will only delete the main project document.
    await deleteDoc(projectRef);

    revalidatePath('/beranda');

    return { success: true, message: 'Project has been deleted successfully.' };
  } catch (error) {
    console.error('Error deleting project:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Project deletion failed: ${errorMessage}` };
  }
}
