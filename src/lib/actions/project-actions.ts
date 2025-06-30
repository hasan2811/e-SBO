'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

/**
 * Server action to create a new project and invite members.
 * @param owner - The user object of the project creator.
 * @param projectName - The name of the new project.
 * @param memberEmailsStr - A comma-separated string of emails to invite.
 * @returns An object with success status and a message.
 */
export async function createProject(
  owner: { uid: string; email: string },
  projectName: string,
  memberEmailsStr: string
): Promise<{ success: boolean; message: string }> {
  if (!owner || !owner.uid || !owner.email) {
    return { success: false, message: 'Authentication required to create a project.' };
  }

  try {
    const memberEmailsInput = memberEmailsStr
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0 && email !== owner.email.toLowerCase());

    const allEmailsToFind = [...new Set(memberEmailsInput)];
    const ownerUid = owner.uid;
    const foundUserUids = new Set<string>([ownerUid]);
    const notFoundEmails = new Set<string>(allEmailsToFind);

    // Batch lookup invited users by their email addresses
    if (allEmailsToFind.length > 0) {
      const usersRef = collection(db, 'users');
      // Firestore 'in' queries are limited to 30 values. We'll chunk if necessary.
      const chunks = [];
      for (let i = 0; i < allEmailsToFind.length; i += 30) {
        chunks.push(allEmailsToFind.slice(i, i + 30));
      }
      
      for (const chunk of chunks) {
        const q = query(usersRef, where('email', 'in', chunk));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach((doc) => {
          foundUserUids.add(doc.id);
          notFoundEmails.delete(doc.data().email.toLowerCase());
        });
      }
    }

    // Create the new project document in Firestore
    await addDoc(collection(db, 'projects'), {
      name: projectName,
      ownerUid: ownerUid,
      memberUids: Array.from(foundUserUids),
      createdAt: new Date().toISOString(),
    });
    
    // Revalidate paths to ensure fresh data is shown on the client
    revalidatePath('/tasks');
    revalidatePath('/beranda');

    const notFoundArray = Array.from(notFoundEmails);
    if (notFoundArray.length > 0) {
      return { 
        success: true, 
        message: `Project created. Could not find users for: ${notFoundArray.join(', ')}`
      };
    }

    return { success: true, message: `Project "${projectName}" was created successfully!` };
  } catch (error) {
    console.error('Error creating project:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    
    if (errorMessage.toLowerCase().includes('permission-denied')) {
        return { success: false, message: 'Project creation failed. Please check Firestore security rules to allow project creation and user lookups.' };
    }
    
    return { success: false, message: `Project creation failed: ${errorMessage}` };
  }
}
