
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
    const observationInfo = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        throw new Error('Document does not exist!');
      }

      const currentObservation = docSnap.data();
      // Robustly handle the likes array to prevent type errors.
      const likes: string[] = Array.isArray(currentObservation.likes) ? currentObservation.likes : [];
      
      const newLikes = likes.includes(userId)
        ? likes.filter(uid => uid !== userId)
        : [...likes, userId];

      transaction.update(docRef, {
        likes: newLikes,
        likeCount: newLikes.length,
      });

      // Safely access scope and projectId for revalidation
      return { 
        scope: currentObservation.scope || null,
        projectId: currentObservation.projectId || null 
      };
    });

    // Revalidate the correct path based on the observation's scope to ensure data consistency.
    if (observationInfo) {
        if (observationInfo.scope === 'public') {
            revalidatePath('/public', 'page');
        } else if (observationInfo.scope === 'private') {
            revalidatePath('/private', 'page');
        } else if (observationInfo.scope === 'project' && observationInfo.projectId) {
            revalidatePath(`/proyek/${observationInfo.projectId}`, 'page');
        }
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
      const currentObservation = docSnap.data();
      // Robustly handle viewCount to ensure it's a number.
      const currentViewCount = typeof currentObservation.viewCount === 'number' ? currentObservation.viewCount : 0;
      transaction.update(docRef, { viewCount: currentViewCount + 1 });
    });
    // View count is only relevant for public posts, so revalidating /public is correct.
    revalidatePath('/public', 'page');
  } catch (error) {
    console.error('Error incrementing view count:', error);
    // This is a non-critical error, so we don't re-throw.
  }
}
