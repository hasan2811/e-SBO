
'use server';

import { db } from '@/lib/firebase';
import { doc, runTransaction } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

interface ToggleLikeParams {
  docId: string;
  userId: string;
  collectionName: 'observations'; // Now we specify collection as path is always root
}

/**
 * Toggles a like on an observation document in a flat structure.
 * This is an atomic operation to prevent race conditions.
 * @param params - The parameters for the toggle operation.
 */
export async function toggleLike({ docId, userId, collectionName }: ToggleLikeParams) {
  if (!docId || !userId || !collectionName) {
    throw new Error('Document ID, User ID, and Collection Name are required.');
  }

  // The path is now always at the root level.
  const docRef = doc(db, collectionName, docId);

  try {
    const observation = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        throw new Error('Document does not exist!');
      }

      const currentObservation = docSnap.data();
      const likes: string[] = currentObservation.likes || [];
      
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
      // Return the observation's scope and project ID for revalidation
      return { scope: currentObservation.scope, projectId: currentObservation.projectId };
    });

    // Revalidate relevant paths based on the observation's scope
    if (observation) {
        if (observation.scope === 'project' && observation.projectId) {
          revalidatePath(`/proyek/${observation.projectId}`);
        } else if (observation.scope === 'private') {
           revalidatePath('/private');
        }
        revalidatePath('/'); // Always revalidate public feed
    }

  } catch (error) {
    console.error('Error toggling like:', error);
    throw new Error('Could not update like status.');
  }
}
