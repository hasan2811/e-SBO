
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, limit, doc, deleteDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Project, UserProfile } from '@/lib/types';

/**
 * Server action to create a new project.
 * Enforces the rule that a user can only own/be in one project at a time.
 * @param owner - The user object of the project creator.
 * @param projectName - The name of the new project.
 * @returns An object with success status and a message.
 */
export async function createProject(
  owner: Pick<UserProfile, 'uid' | 'email' | 'displayName'>,
  projectName: string
): Promise<{ success: boolean; message:string; }> {
  if (!owner || !owner.uid) {
    return { success: false, message: 'Authentication required to create a project.' };
  }
  
  try {
    const projectCollectionRef = collection(db, 'projects');
    
    // STRICT RULE: Check if the user is already a member of ANY project.
    const existingProjectQuery = query(
        projectCollectionRef,
        where('memberUids', 'array-contains', owner.uid),
        limit(1)
    );
    const existingProjectSnapshot = await getDocs(existingProjectQuery);
    if (!existingProjectSnapshot.empty) {
        return { success: false, message: 'Project creation failed: You are already a member of a project.' };
    }

    const memberUids = [owner.uid];

    await addDoc(projectCollectionRef, {
      name: projectName,
      ownerUid: owner.uid,
      memberUids: memberUids, 
      createdAt: new Date().toISOString(),
    });
    
    revalidatePath('/beranda');

    return { success: true, message: `Project "${projectName}" was created successfully!` };
  } catch (error) {
    console.error('Error creating project:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
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

    await deleteDoc(projectRef);

    revalidatePath('/beranda');
    revalidatePath(`/proyek/${projectId}`);

    return { success: true, message: 'Project has been deleted successfully.' };
  } catch (error) {
    console.error('Error deleting project:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Project deletion failed: ${errorMessage}` };
  }
}


/**
 * Adds a new member to a project.
 * Enforces the rule that a user can only be in one project at a time.
 * @param projectId - The ID of the project.
 * @param newMemberEmail - The email of the user to add.
 * @param ownerId - The UID of the user performing the action, to verify ownership.
 * @returns An object with success status and a message.
 */
export async function addProjectMember(
  projectId: string,
  newMemberEmail: string,
  ownerId: string,
): Promise<{ success: boolean; message: string }> {
    if (!projectId || !newMemberEmail || !ownerId) {
        return { success: false, message: "Missing required fields." };
    }

    try {
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
            return { success: false, message: "Project not found." };
        }
        if (projectSnap.data().ownerUid !== ownerId) {
            return { success: false, message: "Only the project owner can add members." };
        }

        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where("email", "==", newMemberEmail.toLowerCase()), limit(1));
        const userSnap = await getDocs(userQuery);

        if (userSnap.empty) {
            return { success: false, message: `User with email ${newMemberEmail} not found.` };
        }
        
        const newMember = userSnap.docs[0].data() as UserProfile;

        // STRICT RULE: Check if the new member is already in ANY project.
        const projectsRef = collection(db, 'projects');
        const memberProjectQuery = query(projectsRef, where('memberUids', 'array-contains', newMember.uid), limit(1));
        const memberProjectSnap = await getDocs(memberProjectQuery);

        if (!memberProjectSnap.empty) {
            return { success: false, message: `User ${newMember.displayName} is already a member of another project.` };
        }
        
        await updateDoc(projectRef, {
            memberUids: arrayUnion(newMember.uid)
        });

        revalidatePath(`/proyek/${projectId}`);
        
        return { success: true, message: `${newMember.displayName} has been added to the project.` };

    } catch (error) {
        console.error("Error adding project member:", error);
        return { success: false, message: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}
