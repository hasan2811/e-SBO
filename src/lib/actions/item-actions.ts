
'use server';

import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { Observation, Inspection, Ptw, AllItems, UserProfile } from '@/lib/types';
import { summarizeObservationData, analyzeDeeperObservation } from '@/ai/flows/summarize-observation-data';
import { analyzeInspectionData } from '@/ai/flows/summarize-observation-data';
import { triggerSmartNotify } from '@/ai/flows/smart-notify-flow';


// ==================================
// UPDATE ACTIONS
// ==================================
export async function updateObservationStatus({ observationId, actionData, user }: { observationId: string, actionData: { actionTakenDescription: string, actionTakenPhotoUrl?: string }, user: UserProfile }): Promise<Observation> {
  try {
    const closerName = `${user.displayName} (${user.position || 'N/A'})`;
    const updatedData: Partial<Observation> = {
        status: 'Completed',
        actionTakenDescription: actionData.actionTakenDescription,
        closedBy: closerName,
        closedDate: new Date().toISOString(),
    };
    
    const observationDocRef = adminDb.collection('observations').doc(observationId);
    if (actionData.actionTakenPhotoUrl) {
        updatedData.actionTakenPhotoUrl = actionData.actionTakenPhotoUrl;
    }
    
    await observationDocRef.update(updatedData);
    const updatedDocSnap = await observationDocRef.get();
    
    if (!updatedDocSnap.exists()) {
      throw new Error('Observation document not found after update. It may have been deleted simultaneously.');
    }
  
    const finalDocData = updatedDocSnap.data() as Omit<Observation, 'id'>;
    const projectId = finalDocData?.projectId;
  
    revalidatePath(projectId ? `/proyek/${projectId}` : '/private', 'page');
    revalidatePath('/tasks', 'page');
    return { ...finalDocData, id: updatedDocSnap.id };
  } catch (error) {
    console.error(`[Server Action - updateObservationStatus] Failed for observation ${observationId}:`, error);
    throw new Error('Failed to update observation status on the server.');
  }
}

export async function updateInspectionStatus({ inspectionId, actionData, user }: { inspectionId: string, actionData: { actionTakenDescription: string, actionTakenPhotoUrl?: string }, user: UserProfile }): Promise<Inspection> {
  try {
    const closerName = `${user.displayName} (${user.position || 'N/A'})`;
    const updatedData: Partial<Inspection> = {
        status: 'Pass',
        actionTakenDescription: actionData.actionTakenDescription,
        closedBy: closerName,
        closedDate: new Date().toISOString(),
    };
  
    const inspectionDocRef = adminDb.collection('inspections').doc(inspectionId);
    if (actionData.actionTakenPhotoUrl) {
        updatedData.actionTakenPhotoUrl = actionData.actionTakenPhotoUrl;
    }
  
    await inspectionDocRef.update(updatedData);
    const updatedDocSnap = await inspectionDocRef.get();
    
    if (!updatedDocSnap.exists()) {
      throw new Error('Inspection document not found after update. It may have been deleted simultaneously.');
    }
  
    const finalDocData = updatedDocSnap.data() as Omit<Inspection, 'id'>;
    const projectId = finalDocData?.projectId;
    
    revalidatePath(projectId ? `/proyek/${projectId}` : '/private', 'page');
    revalidatePath('/tasks', 'page');
    return { ...finalDocData, id: updatedDocSnap.id };
  } catch (error) {
    console.error(`[Server Action - updateInspectionStatus] Failed for inspection ${inspectionId}:`, error);
    throw new Error('Failed to update inspection status on the server.');
  }
}

export async function approvePtw({ ptwId, signatureDataUrl, approverName, approverPosition }: { ptwId: string, signatureDataUrl: string, approverName: string, approverPosition: string }): Promise<Ptw> {
    try {
      const ptwDocRef = adminDb.collection('ptws').doc(ptwId);
      const approver = `${approverName} (${approverPosition || 'N/A'})`;
      
      await ptwDocRef.update({
          status: 'Approved', signatureDataUrl, approver, approvedDate: new Date().toISOString(),
      });
  
      const updatedDocSnap = await ptwDocRef.get();
  
      if (!updatedDocSnap.exists()) {
        throw new Error('PTW document not found after update. It may have been deleted simultaneously.');
      }
    
      const finalDocData = updatedDocSnap.data() as Omit<Ptw, 'id'>;
      const projectId = finalDocData?.projectId;
  
      revalidatePath(projectId ? `/proyek/${projectId}` : '/private', 'page');
      return { ...finalDocData, id: updatedDocSnap.id };
    } catch (error) {
      console.error(`[Server Action - approvePtw] Failed for PTW ${ptwId}:`, error);
      throw new Error('Failed to approve PTW on the server.');
    }
}

// ==================================
// DELETE ACTIONS - REWRITTEN FOR RELIABILITY
// ==================================

/**
 * Safely deletes a file from Firebase Storage from its public URL.
 * This function will not throw an error if deletion fails, it will only log it.
 * This ensures that a failed file deletion does not stop the primary action (e.g., deleting a Firestore document).
 * @param fileUrl The full `https://firebasestorage.googleapis.com/...` URL of the file.
 */
async function safeDeleteStorageFile(fileUrl: string | undefined | null) {
  if (!fileUrl || !fileUrl.startsWith('https://firebasestorage.googleapis.com')) {
    // Not a valid storage URL, so nothing to do.
    return;
  }

  try {
    const bucket = adminStorage.bucket();
    
    // Extract the file path from the URL. Example: /v0/b/bucket-name/o/path%2Fto%2Ffile.jpg -> path/to/file.jpg
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/o/');
    if (pathParts.length < 2) {
      console.warn(`[safeDeleteStorageFile] Could not extract file path from URL: ${fileUrl}`);
      return;
    }
    const encodedFilePath = pathParts[1].split('?')[0];
    
    if (!encodedFilePath) {
      console.warn(`[safeDeleteStorageFile] Found empty file path from URL: ${fileUrl}`);
      return;
    }

    const filePath = decodeURIComponent(encodedFilePath);
    const file = bucket.file(filePath);
    
    // Check if the file exists before trying to delete. This avoids benign "not found" errors.
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
    }
  } catch (error) {
    // Log any unexpected errors but do not re-throw them.
    console.error(`[safeDeleteStorageFile] An unexpected error occurred while trying to delete file at ${fileUrl}. Error:`, error);
  }
}

/**
 * Deletes a single item. This action prioritizes deleting the database entry
 * and providing immediate feedback to the user. File deletion happens in the background.
 * @param item - The item (Observation, Inspection, or Ptw) to delete.
 */
export async function deleteItem(item: AllItems) {
  try {
    const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
    
    // 1. Immediately delete the Firestore document. This is the critical part.
    await docRef.delete();

    // 2. Schedule file deletions to run in the background. We don't `await` these.
    //    This ensures the user gets an immediate success response.
    if (item.itemType === 'observation' || item.itemType === 'inspection') {
      safeDeleteStorageFile(item.photoUrl);
      if ('actionTakenPhotoUrl' in item) {
        safeDeleteStorageFile(item.actionTakenPhotoUrl);
      }
    } else if (item.itemType === 'ptw') {
      safeDeleteStorageFile(item.jsaPdfUrl);
    }
    
    // 3. Revalidate paths to update the UI on the next navigation.
    revalidatePath('/public', 'page');
    revalidatePath('/private', 'page');
    revalidatePath('/tasks', 'page');
    if (item.projectId) {
      revalidatePath(`/proyek/${item.projectId}`, 'page');
    }

  } catch (error) {
    console.error(`[deleteItem Action] Failed to delete item ${item.id}:`, error);
    // If the Firestore deletion fails, throw an error back to the client.
    throw new Error('Failed to delete the report from the database.');
  }
}

/**
 * Deletes multiple items using a batch operation. This is an atomic operation for Firestore.
 * File deletions happen in the background.
 * @param items - An array of items to delete.
 */
export async function deleteMultipleItems(items: AllItems[]) {
  if (items.length === 0) return;

  try {
    const batch = adminDb.batch();

    items.forEach(item => {
      // 1. Add document deletion to the batch.
      const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
      batch.delete(docRef);

      // 2. Schedule file deletions to run in the background.
      if (item.itemType === 'observation' || item.itemType === 'inspection') {
        safeDeleteStorageFile(item.photoUrl);
        if ('actionTakenPhotoUrl' in item) {
          safeDeleteStorageFile(item.actionTakenPhotoUrl);
        }
      } else if (item.itemType === 'ptw') {
        safeDeleteStorageFile(item.jsaPdfUrl);
      }
    });

    // 3. Commit the atomic batch deletion for Firestore documents.
    await batch.commit();

    // 4. Revalidate all potentially affected paths.
    revalidatePath('/public', 'page');
    revalidatePath('/private', 'page');
    revalidatePath('/tasks', 'page');
    const projectIds = new Set(items.map(i => i.projectId).filter(Boolean));
    projectIds.forEach(id => revalidatePath(`/proyek/${id}`, 'page'));
    
  } catch (error) {
    console.error(`[deleteMultipleItems Action] Failed to delete items:`, error);
    throw new Error('Failed to delete the selected reports from the database.');
  }
}


// ==================================
// AI & OTHER ACTIONS
// ==================================
export async function triggerObservationAnalysis(observation: Observation) {
  const docRef = adminDb.collection('observations').doc(observation.id);

  try {
    await docRef.update({ aiStatus: 'processing' });
    revalidatePath(observation.projectId ? `/proyek/${observation.projectId}` : '/private', 'page');

    const observationData = `
      Temuan: ${observation.findings}
      Rekomendasi: ${observation.recommendation}
      Lokasi: ${observation.location}
      Perusahaan: ${observation.company}
      Pengamat: ${observation.submittedBy}
    `;

    if (observation.scope === 'project' && observation.projectId) {
      const submittedByName = observation.submittedBy.split(' (')[0];
      triggerSmartNotify({
        observationId: observation.id,
        projectId: observation.projectId,
        company: observation.company,
        findings: observation.findings,
        submittedBy: submittedByName,
      }).catch(err => {
        console.error(`Smart-notify trigger failed for obs ${observation.id}`, err);
      });
    }

    const analysis = await summarizeObservationData({ observationData });

    const updatePayload: Partial<Observation> = {
      aiStatus: 'completed',
      category: analysis.suggestedCategory,
      aiSuggestedRiskLevel: analysis.suggestedRiskLevel,
      aiSummary: analysis.summary,
      aiObserverSkillRating: analysis.aiObserverSkillRating,
      aiObserverSkillExplanation: analysis.aiObserverSkillExplanation,
    };
    
    await docRef.update(updatePayload);

  } catch (error) {
    console.error(`AI analysis failed for observation ${observation.id}:`, error);
    await docRef.update({ aiStatus: 'failed' });
  } finally {
      revalidatePath(observation.projectId ? `/proyek/${observation.projectId}` : '/private', 'page');
      revalidatePath('/tasks', 'page');
  }
}

export async function runDeeperAnalysis(observationId: string): Promise<Observation> {
    const docRef = adminDb.collection('observations').doc(observationId);
    
    try {
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            throw new Error("Observation not found.");
        }
        const observation = docSnap.data() as Observation;

        await docRef.update({ aiStatus: 'processing' });
        revalidatePath(observation.projectId ? `/proyek/${observation.projectId}` : '/private', 'page');

        const observationData = `
            Temuan: ${observation.findings}
            Rekomendasi: ${observation.recommendation}
            Lokasi: ${observation.location}
            Perusahaan: ${observation.company}
            Pengamat: ${observation.submittedBy}
            Kategori Awal: ${observation.category}
            Tingkat Risiko Awal: ${observation.riskLevel}
        `;
        
        const deepAnalysis = await analyzeDeeperObservation({ observationData });
        
        const updatePayload: Partial<Observation> = {
            aiStatus: 'completed',
            aiRisks: deepAnalysis.risks,
            aiSuggestedActions: deepAnalysis.suggestedActions,
            aiRootCauseAnalysis: deepAnalysis.rootCauseAnalysis,
            aiRelevantRegulations: deepAnalysis.relevantRegulations,
        };
        
        await docRef.update(updatePayload);
        const updatedDoc = await docRef.get();
        revalidatePath(observation.projectId ? `/proyek/${observation.projectId}` : '/private', 'page');
        
        return { ...updatedDoc.data(), id: updatedDoc.id } as Observation;

    } catch (error) {
        console.error(`Deeper AI analysis failed for observation ${observationId}:`, error);
        await docRef.update({ aiStatus: 'failed' });
        throw error;
    }
}


export async function triggerInspectionAnalysis(inspection: Inspection) {
  const docRef = adminDb.collection('inspections').doc(inspection.id);

  try {
    await docRef.update({ aiStatus: 'processing' });
    revalidatePath(inspection.projectId ? `/proyek/${inspection.projectId}` : '/private', 'page');

    const inspectionData = `
      Nama Peralatan: ${inspection.equipmentName}
      Jenis Peralatan: ${inspection.equipmentType}
      Temuan: ${inspection.findings}
      Rekomendasi: ${inspection.recommendation || 'Tidak ada'}
      Lokasi: ${inspection.location}
      Status Laporan: ${inspection.status}
      Penginspeksi: ${inspection.submittedBy}
    `;

    const analysis = await analyzeInspectionData({ inspectionData });

    const updatePayload = {
      aiStatus: 'completed',
      aiSummary: analysis.summary,
      aiRisks: analysis.risks,
      aiSuggestedActions: analysis.suggestedActions,
    };

    await docRef.update(updatePayload);

  } catch (error) {
    console.error(`AI analysis failed for inspection ${inspection.id}:`, error);
    await docRef.update({ aiStatus: 'failed' });
  } finally {
    revalidatePath(inspection.projectId ? `/proyek/${inspection.projectId}` : '/private', 'page');
  }
}


export async function retryAiAnalysis(item: Observation | Inspection) {
    if (item.itemType === 'observation') {
      await triggerObservationAnalysis(item);
    } else if (item.itemType === 'inspection') {
      await triggerInspectionAnalysis(item);
    }
    const updatedDoc = await adminDb.collection(`${item.itemType}s`).doc(item.id).get();
    return { ...updatedDoc.data(), id: updatedDoc.id } as AllItems;
}

export async function shareObservationToPublic(observation: Observation, userProfile: UserProfile) {
  if (observation.isSharedPublicly) {
      throw new Error("This observation has already been shared.");
  }
  
  const publicObservationData: Partial<Observation> = {
      ...observation,
      date: new Date().toISOString(),
      status: 'Pending',
      scope: 'public',
      projectId: null,
      originalId: observation.id,
      originalScope: observation.scope,
      sharedBy: userProfile.displayName,
      sharedByPosition: userProfile.position,
      likes: [],
      likeCount: 0,
      commentCount: 0,
      viewCount: 0,
  };

  delete publicObservationData.id;
  delete publicObservationData.isSharedPublicly;
  delete publicObservationData.actionTakenDescription;
  delete publicObservationData.actionTakenPhotoUrl;
  delete publicObservationData.closedBy;
  delete publicObservationData.closedDate;
  
  const originalDocRef = adminDb.collection('observations').doc(observation.id);

  const batch = adminDb.batch();
  const newPublicDocRef = adminDb.collection('observations').doc();
  batch.set(newPublicDocRef, publicObservationData);
  batch.update(originalDocRef, { isSharedPublicly: true });
  await batch.commit();
  
  revalidatePath('/public', 'page');
  revalidatePath(observation.projectId ? `/proyek/${observation.projectId}` : '/private', 'page');
  
  const updatedDoc = await originalDocRef.get();
  return { ...updatedDoc.data(), id: updatedDoc.id } as Observation;
}
