
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

/**
 * Server action to create a new project.
 * This is now simplified and more secure. It only takes the project name
 * and automatically sets the creator as the sole owner and member.
 * @param owner - The user object of the project creator.
 * @param projectName - The name of the new project.
 * @returns An object with success status and a message.
 */
export async function createProject(
  owner: { uid: string; email: string },
  projectName: string
): Promise<{ success: boolean; message: string }> {
  if (!owner || !owner.uid) {
    return { success: false, message: 'Authentication required to create a project.' };
  }
  
  try {
    const projectCollectionRef = collection(db, 'projects');
    
    // The new project document. memberUids now only contains the creator's UID.
    await addDoc(projectCollectionRef, {
      name: projectName,
      ownerUid: owner.uid,
      memberUids: [owner.uid], // Creator is the first and only member initially.
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
