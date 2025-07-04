
'use server';

import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { Observation, Inspection, Ptw, AllItems, UserProfile } from '@/lib/types';
import { summarizeObservationData } from '@/ai/flows/summarize-observation-data';
import { analyzeInspectionData } from '@/ai/flows/summarize-observation-data';
import { triggerSmartNotify } from '@/ai/flows/smart-notify-flow';


// ==================================
// UPDATE ACTIONS
// ==================================
export async function updateObservationStatus({ observationId, actionData, user }: { observationId: string, actionData: { actionTakenDescription: string, actionTakenPhotoUrl?: string }, user: UserProfile }) {
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
  const updatedDoc = await observationDocRef.get();
  
  revalidatePath(updatedDoc.data()?.projectId ? `/proyek/${updatedDoc.data()?.projectId}` : '/private', 'page');
  revalidatePath('/tasks', 'page');
  return { ...updatedDoc.data(), id: updatedDoc.id } as Observation;
}

export async function updateInspectionStatus({ inspectionId, actionData, user }: { inspectionId: string, actionData: { actionTakenDescription: string, actionTakenPhotoUrl?: string }, user: UserProfile }) {
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
  const updatedDoc = await inspectionDocRef.get();
  
  revalidatePath(updatedDoc.data()?.projectId ? `/proyek/${updatedDoc.data()?.projectId}` : '/private', 'page');
  return { ...updatedDoc.data(), id: updatedDoc.id } as Inspection;
}

export async function approvePtw({ ptwId, signatureDataUrl, approverName, approverPosition }: { ptwId: string, signatureDataUrl: string, approverName: string, approverPosition: string }): Promise<Ptw> {
    const ptwDocRef = adminDb.collection('ptws').doc(ptwId);
    const approver = `${approverName} (${approverPosition || 'N/A'})`;
    
    await ptwDocRef.update({
        status: 'Approved', signatureDataUrl, approver, approvedDate: new Date().toISOString(),
    });

    const updatedDoc = await ptwDocRef.get();
    revalidatePath(updatedDoc.data()?.projectId ? `/proyek/${updatedDoc.data()?.projectId}` : '/private', 'page');
    return { ...updatedDoc.data(), id: updatedDoc.id } as Ptw;
}

// ==================================
// DELETE ACTIONS
// ==================================

/**
 * Deletes a file from Firebase Storage using the Admin SDK.
 * This is a server-side only function.
 * @param fileUrl The public download URL of the file to delete.
 */
async function deleteStorageFileFromUrl(fileUrl: string | undefined | null): Promise<void> {
  if (!fileUrl || !fileUrl.startsWith('https://firebasestorage.googleapis.com')) {
    return;
  }
  
  try {
    const bucket = adminStorage.bucket();
    // More robust way to extract the file path from the URL
    const filePath = decodeURIComponent(fileUrl.split('/o/')[1].split('?')[0]);
    
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    if (exists) {
        await file.delete();
    } else {
        console.warn(`[Admin Storage] File not found for deletion, probably already deleted: ${filePath}`);
    }
  } catch (error) {
    console.error(`[Admin Storage] Failed to delete file. URL: ${fileUrl}, Error:`, error);
    // Do not re-throw, to allow Firestore document deletion to proceed even if file deletion fails.
  }
}

export async function deleteItem(item: AllItems) {
  try {
    const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
    
    // Delete associated files from storage first
    if (item.itemType === 'observation' || item.itemType === 'inspection') {
      await deleteStorageFileFromUrl(item.photoUrl);
      if ('actionTakenPhotoUrl' in item) {
        await deleteStorageFileFromUrl(item.actionTakenPhotoUrl);
      }
    } else if (item.itemType === 'ptw') {
      await deleteStorageFileFromUrl(item.jsaPdfUrl);
    }

    // Delete the Firestore document
    await docRef.delete();
    
    // Revalidate relevant paths to reflect the change in the UI
    revalidatePath(item.projectId ? `/proyek/${item.projectId}` : '/private', 'page');
    revalidatePath('/public', 'page');
    revalidatePath('/tasks', 'page');
  } catch (error) {
    console.error(`[deleteItem Action] Failed to delete item ${item.id}:`, error);
    // Re-throw the error to be caught by the client-side component
    throw new Error('Failed to delete the item on the server.');
  }
}

export async function deleteMultipleItems(items: AllItems[]) {
  try {
    const batch = adminDb.batch();
    const filesToDelete: (string | undefined | null)[] = [];

    items.forEach(item => {
      const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
      batch.delete(docRef);
      if (item.itemType === 'observation' || item.itemType === 'inspection') {
        filesToDelete.push(item.photoUrl);
        if ('actionTakenPhotoUrl' in item) {
          filesToDelete.push(item.actionTakenPhotoUrl);
        }
      } else if (item.itemType === 'ptw') {
        filesToDelete.push(item.jsaPdfUrl);
      }
    });

    // Delete files and commit batch in parallel for efficiency
    await Promise.all([
      ...filesToDelete.map(url => url ? deleteStorageFileFromUrl(url) : Promise.resolve()),
      batch.commit()
    ]);
    
    // Revalidate all potentially affected paths
    revalidatePath('/private', 'page');
    revalidatePath('/public', 'page');
    const projectIds = new Set(items.map(i => i.projectId).filter(Boolean));
    projectIds.forEach(id => revalidatePath(`/proyek/${id}`, 'page'));
    revalidatePath('/tasks', 'page');
  } catch (error) {
    console.error(`[deleteMultipleItems Action] Failed to delete items:`, error);
    throw new Error('Failed to delete the items on the server.');
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

    // Trigger smart notify in parallel with the main analysis
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

    const updatePayload = {
      aiStatus: 'completed',
      category: analysis.suggestedCategory,
      riskLevel: analysis.suggestedRiskLevel,
      aiSummary: analysis.summary,
      aiSuggestedRiskLevel: analysis.suggestedRiskLevel,
      // The following are no longer generated to improve speed
      // aiRisks: analysis.risks,
      // aiSuggestedActions: analysis.suggestedActions,
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

  // Explicitly delete properties that shouldn't be in the new public copy
  delete publicObservationData.id;
  delete publicObservationData.isSharedPublicly;
  delete publicObservationData.actionTakenDescription;
  delete publicObservationData.actionTakenPhotoUrl;
  delete publicObservationData.closedBy;
  delete publicObservationData.closedDate;
  
  const originalDocRef = adminDb.collection('observations').doc(observation.id);

  // Use a batch to ensure atomicity
  const batch = adminDb.batch();
  const newPublicDocRef = adminDb.collection('observations').doc(); // Create a new doc reference
  batch.set(newPublicDocRef, publicObservationData);
  batch.update(originalDocRef, { isSharedPublicly: true });
  await batch.commit();
  
  revalidatePath('/public', 'page');
  revalidatePath(observation.projectId ? `/proyek/${observation.projectId}` : '/private', 'page');
  
  const updatedDoc = await originalDocRef.get();
  return { ...updatedDoc.data(), id: updatedDoc.id } as Observation;
}
