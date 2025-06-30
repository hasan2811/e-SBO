
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, writeBatch, documentId, arrayUnion, doc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

/**
 * Server action to create a new project and invite members.
 * It now updates each member's user document with the new project ID.
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

  const batch = writeBatch(db);
  
  try {
    const trimmedEmails = memberEmailsStr
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0 && email.includes('@'));
      
    const memberEmailsInput = [...new Set([owner.email.toLowerCase(), ...trimmedEmails])];

    const foundUsers: { uid: string; email: string }[] = [];
    const notFoundEmails = new Set<string>(memberEmailsInput);

    // Find users by email in chunks of 30 (Firestore 'in' query limit)
    if (memberEmailsInput.length > 0) {
      const emailChunks: string[][] = [];
      for (let i = 0; i < memberEmailsInput.length; i += 30) {
        emailChunks.push(memberEmailsInput.slice(i, i + 30));
      }

      const userQueries = emailChunks.map(chunk => 
        getDocs(query(collection(db, 'users'), where('email', 'in', chunk)))
      );
      const querySnapshots = await Promise.all(userQueries);
      
      for (const snapshot of querySnapshots) {
        snapshot.forEach((doc) => {
          const userData = doc.data();
          foundUsers.push({ uid: doc.id, email: userData.email });
          notFoundEmails.delete(userData.email.toLowerCase());
        });
      }
    }

    const memberUids = foundUsers.map(u => u.uid);

    // 1. Create the new project document
    const projectRef = doc(collection(db, 'projects'));
    batch.set(projectRef, {
      name: projectName,
      ownerUid: owner.uid,
      memberUids: memberUids,
      createdAt: new Date().toISOString(),
    });

    // 2. Update each member's user document to add the new project ID
    foundUsers.forEach(member => {
      const userRef = doc(db, 'users', member.uid);
      batch.update(userRef, {
        projectIds: arrayUnion(projectRef.id)
      });
    });
    
    // Commit all writes at once
    await batch.commit();
    
    revalidatePath('/tasks');
    revalidatePath('/beranda');

    const notFoundArray = Array.from(notFoundEmails);
    if (notFoundArray.length > 0) {
      return { 
        success: true, 
        message: `Project "${projectName}" created! However, these users could not be invited as they are not registered: ${notFoundArray.join(', ')}. Please ask them to sign up first.`
      };
    }

    return { success: true, message: `Project "${projectName}" was created successfully and all members have been invited!` };
  } catch (error) {
    console.error('Error creating project:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    
    if (errorMessage.toLowerCase().includes('permission-denied')) {
        return { success: false, message: 'Permission denied. Please check your Firestore security rules to allow project creation and user lookups.' };
    }
    
    return { success: false, message: `Project creation failed: ${errorMessage}` };
  }
}
