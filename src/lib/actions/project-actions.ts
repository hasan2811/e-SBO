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
      .filter((email) => email.length > 0 && email.includes('@') && email !== owner.email.toLowerCase());

    const allEmailsToFind = [...new Set(memberEmailsInput)];
    const ownerUid = owner.uid;
    const foundUserUids = new Set<string>([ownerUid]);
    const notFoundEmails = new Set<string>();

    if (allEmailsToFind.length > 0) {
      // Firestore 'in' queries are limited to 30 items. Chunk the emails to handle more.
      const emailChunks = [];
      for (let i = 0; i < allEmailsToFind.length; i += 30) {
        emailChunks.push(allEmailsToFind.slice(i, i + 30));
      }

      const userQueries = emailChunks.map(chunk => getDocs(query(collection(db, 'users'), where('email', 'in', chunk))));
      const querySnapshots = await Promise.all(userQueries);

      const foundEmails = new Set<string>();
      for (const snapshot of querySnapshots) {
        snapshot.forEach((doc) => {
          const userData = doc.data();
          foundUserUids.add(doc.id);
          foundEmails.add(userData.email.toLowerCase());
        });
      }
      
      allEmailsToFind.forEach(email => {
        if (!foundEmails.has(email)) {
          notFoundEmails.add(email);
        }
      });
    }

    await addDoc(collection(db, 'projects'), {
      name: projectName,
      ownerUid: ownerUid,
      memberUids: Array.from(foundUserUids),
      createdAt: new Date().toISOString(),
    });
    
    // Revalidate paths to ensure fresh data is shown on relevant pages.
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
