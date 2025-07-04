
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
}

export async function updateInspectionStatus({ inspectionId, actionData, user }: { inspectionId: string, actionData: { actionTakenDescription: string, actionTakenPhotoUrl?: string }, user: UserProfile }): Promise<Inspection> {
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
  revalidatePath('/tasks', 'page'); // Added for consistency
  return { ...finalDocData, id: updatedDocSnap.id };
}

export async function approvePtw({ ptwId, signatureDataUrl, approverName, approverPosition }: { ptwId: string, signatureDataUrl: string, approverName: string, approverPosition: string }): Promise<Ptw> {
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
}

// ==================================
// DELETE ACTIONS
// ==================================

async function deleteStorageFileFromUrl(fileUrl: string | undefined | null): Promise<void> {
    if (!fileUrl || !fileUrl.startsWith('https://firebasestorage.googleapis.com')) {
        return;
    }
    try {
        const url = new URL(fileUrl);
        // Pathname looks like: /v0/b/bucket-name/o/path%2Fto%2Ffile.jpg
        const pathStartIndex = url.pathname.indexOf('/o/');
        if (pathStartIndex === -1) {
            console.warn(`[Admin Storage] Could not find '/o/' in the file URL path: ${fileUrl}`);
            return;
        }

        // The actual path is after the /o/ and needs to be decoded.
        const encodedFilePath = url.pathname.substring(pathStartIndex + 3);
        const filePath = decodeURIComponent(encodedFilePath);

        const bucket = adminStorage.bucket();
        const file = bucket.file(filePath);
        await file.delete();
    } catch (error: any) {
        // A 404 error is okay, it means the file was already gone.
        if (error.code === 404 || error.code === 'storage/object-not-found') {
            console.warn(`[Admin Storage] File not found for deletion, probably already deleted: ${fileUrl}`);
        } else {
            // Log other errors but don't re-throw, as we don't want to block the primary action.
            console.error(`[Admin Storage] Failed to delete file. URL: ${fileUrl}, Error:`, error);
        }
    }
}

export async function deleteItem(item: AllItems) {
  try {
    const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
    
    // Immediately delete the Firestore document
    await docRef.delete();

    // Trigger file deletions in the background (fire and forget) without waiting
    if (item.itemType === 'observation' || item.itemType === 'inspection') {
      deleteStorageFileFromUrl(item.photoUrl);
      if ('actionTakenPhotoUrl' in item) {
        deleteStorageFileFromUrl(item.actionTakenPhotoUrl);
      }
    } else if (item.itemType === 'ptw') {
      deleteStorageFileFromUrl(item.jsaPdfUrl);
    }
    
    // Revalidate paths to update the UI
    revalidatePath(item.projectId ? `/proyek/${item.projectId}` : '/private', 'page');
    revalidatePath('/public', 'page');
    revalidatePath('/tasks', 'page');
  } catch (error) {
    console.error(`[deleteItem Action] Failed to delete item ${item.id}:`, error);
    throw new Error('Failed to delete the item on the server.');
  }
}

export async function deleteMultipleItems(items: AllItems[]) {
  try {
    const batch = adminDb.batch();

    items.forEach(item => {
      const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
      batch.delete(docRef);

      // Trigger file deletions in the background (fire and forget) for each item
      if (item.itemType === 'observation' || item.itemType === 'inspection') {
        deleteStorageFileFromUrl(item.photoUrl);
        if ('actionTakenPhotoUrl' in item) {
          deleteStorageFileFromUrl(item.actionTakenPhotoUrl);
        }
      } else if (item.itemType === 'ptw') {
        deleteStorageFileFromUrl(item.jsaPdfUrl);
      }
    });

    // Commit the batch deletion of Firestore documents immediately
    await batch.commit();
    
    // Revalidate relevant paths
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
      // Keep the user-defined risk level, but store the AI suggestion separately
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
