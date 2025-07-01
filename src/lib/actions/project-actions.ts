
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, limit, doc, deleteDoc, getDoc, writeBatch } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Project, UserProfile } from '@/lib/types';

/**
 * Finds user UIDs based on a list of email addresses.
 * @param emails - An array of email strings to look up.
 * @returns A promise that resolves to an array of found user UIDs.
 */
async function findUserIdsByEmails(emails: string[]): Promise<string[]> {
  if (!emails || emails.length === 0) {
    return [];
  }
  
  const userIds: string[] = [];
  const usersRef = collection(db, 'users');
  
  // Firestore 'in' query is limited to 30 items. We process in chunks.
  const chunks = [];
  for (let i = 0; i < emails.length; i += 30) {
    chunks.push(emails.slice(i, i + 30));
  }

  for (const chunk of chunks) {
    const q = query(usersRef, where('email', 'in', chunk));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      userIds.push(doc.id);
    });
  }

  return userIds;
}


/**
 * Server action to create a new project.
 * Allows inviting members by email during creation.
 * The creator is automatically the owner and a member.
 * @param owner - The user object of the project creator.
 * @param projectName - The name of the new project.
 * @param memberEmails - An array of emails of members to invite.
 * @returns An object with success status and a message.
 */
export async function createProject(
  owner: Pick<UserProfile, 'uid' | 'email' | 'displayName'>,
  projectName: string,
  memberEmails: string[]
): Promise<{ success: boolean; message:string; }> {
  if (!owner || !owner.uid) {
    return { success: false, message: 'Authentication required to create a project.' };
  }
  
  try {
    const projectCollectionRef = collection(db, 'projects');
    
    // Find UIDs for the invited members
    const invitedMemberUids = await findUserIdsByEmails(memberEmails);

    // Combine owner UID with invited member UIDs, ensuring no duplicates
    const allMemberUids = [...new Set([owner.uid, ...invitedMemberUids])];

    await addDoc(projectCollectionRef, {
      name: projectName,
      ownerUid: owner.uid,
      memberUids: allMemberUids, 
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

    return { success: true, message: 'Project has been deleted successfully.' };
  } catch (error) {
    console.error('Error deleting project:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Project deletion failed: ${errorMessage}` };
  }
}
