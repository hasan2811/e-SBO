
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

interface ToggleLikeParams {
  docId: string;
  userId: string;
  collectionName: 'observations';
}

/**
 * Toggles a like on an observation document. This is an atomic operation.
 * Now uses the Admin SDK to bypass Firestore rules.
 * @param params - The parameters for the toggle operation.
 */
export async function toggleLike({ docId, userId, collectionName }: ToggleLikeParams) {
  if (!docId || !userId || !collectionName) {
    throw new Error('Document ID, User ID, and Collection Name are required.');
  }

  const docRef = adminDb.collection(collectionName).doc(docId);

  try {
    const observationInfo = await adminDb.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists) {
        throw new Error('Document does not exist!');
      }

      const currentObservation = docSnap.data();
      if (!currentObservation) {
        throw new Error(`Document ${docId} exists but contains no data.`);
      }
      
      const likes: string[] = Array.isArray(currentObservation.likes) ? currentObservation.likes : [];
      
      const newLikes = likes.includes(userId)
        ? likes.filter(uid => uid !== userId)
        : [...likes, userId];

      transaction.update(docRef, {
        likes: newLikes,
        likeCount: newLikes.length,
      });

      return { 
        scope: currentObservation.scope || null,
        projectId: currentObservation.projectId || null 
      };
    });

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
 * Now uses the Admin SDK to bypass Firestore rules.
 * @param params - The parameters for the increment operation.
 */
export async function incrementViewCount({ docId, collectionName }: { docId: string; collectionName: 'observations' }) {
  if (!docId || !collectionName) {
    return;
  }
  const docRef = adminDb.collection(collectionName).doc(docId);
  try {
    await adminDb.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists) return;
      const currentObservation = docSnap.data();
      if (!currentObservation) return;
      
      const currentViewCount = typeof currentObservation.viewCount === 'number' ? currentObservation.viewCount : 0;
      transaction.update(docRef, { viewCount: currentViewCount + 1 });
    });
    revalidatePath('/public', 'page');
  } catch (error) {
    console.error('Error incrementing view count:', error);
  }
}
