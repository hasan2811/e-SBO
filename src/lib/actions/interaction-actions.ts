
'use server';

import { db } from '@/lib/firebase';
import { doc, runTransaction } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

interface ToggleLikeParams {
  docId: string;
  userId: string;
  collectionName: 'observations';
}

/**
 * Toggles a like on an observation document. This is an atomic operation.
 * @param params - The parameters for the toggle operation.
 */
export async function toggleLike({ docId, userId, collectionName }: ToggleLikeParams) {
  if (!docId || !userId || !collectionName) {
    throw new Error('Document ID, User ID, and Collection Name are required.');
  }

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
        newLikes = likes.filter(uid => uid !== userId);
      } else {
        newLikes = [...likes, userId];
      }

      transaction.update(docRef, {
        likes: newLikes,
        likeCount: newLikes.length,
      });
      return { scope: currentObservation.scope, projectId: currentObservation.projectId };
    });

    if (observation) {
        revalidatePath('/public');
    }

  } catch (error) {
    console.error('Error toggling like:', error);
    throw new Error('Could not update like status.');
  }
}

/**
 * Increments the view count for a document.
 * @param params - The parameters for the increment operation.
 */
export async function incrementViewCount({ docId, collectionName }: { docId: string; collectionName: 'observations' }) {
  if (!docId || !collectionName) {
    return; // Don't throw error, just fail silently.
  }
  const docRef = doc(db, collectionName, docId);
  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        return; // Document not found, do nothing.
      }
      const currentViewCount = docSnap.data().viewCount || 0;
      transaction.update(docRef, { viewCount: currentViewCount + 1 });
    });
    revalidatePath('/public');
  } catch (error) {
    console.error('Error incrementing view count:', error);
    // This is a non-critical error, so we don't re-throw.
  }
}
