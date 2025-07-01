
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, runTransaction } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Scope } from '@/lib/types';

interface ToggleLikeParams {
  docId: string;
  userId: string;
  scope: Scope;
  projectId?: string | null;
}

/**
 * Toggles a like on an observation document.
 * This is an atomic operation to prevent race conditions.
 * @param params - The parameters for the toggle operation.
 */
export async function toggleLike({ docId, userId, scope, projectId }: ToggleLikeParams) {
  if (!docId || !userId) {
    throw new Error('Document ID and User ID are required.');
  }

  let docRef;
  if (scope === 'project' && projectId) {
    docRef = doc(db, 'projects', projectId, 'observations', docId);
  } else {
    // Works for both 'public' and 'private' scopes
    docRef = doc(db, 'observations', docId);
  }

  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        throw new Error('Document does not exist!');
      }

      const observation = docSnap.data();
      const likes: string[] = observation.likes || [];
      
      let newLikes: string[];
      if (likes.includes(userId)) {
        // User has already liked, so unlike
        newLikes = likes.filter(uid => uid !== userId);
      } else {
        // User has not liked, so like
        newLikes = [...likes, userId];
      }

      transaction.update(docRef, {
        likes: newLikes,
        likeCount: newLikes.length,
      });
    });

    // Revalidate relevant paths
    if (scope === 'project' && projectId) {
      revalidatePath(`/proyek/${projectId}`);
    } else if (scope === 'public') {
      revalidatePath('/');
    } else { // private
      revalidatePath('/private');
    }

  } catch (error) {
    console.error('Error toggling like:', error);
    throw new Error('Could not update like status.');
  }
}
