
'use server';

import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { Observation, Inspection, Ptw, AllItems, UserProfile } from '@/lib/types';
import { summarizeObservationData, analyzeDeeperObservation, analyzeDeeperInspection, analyzeInspectionData } from '@/ai/flows/summarize-observation-data';
import { triggerSmartNotify } from '@/ai/flows/smart-notify-flow';
import { googleAI } from '@genkit-ai/googleai';

// ==================================
// HELPER TO GET USER AND CHECK AI STATUS
// ==================================
async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        console.warn(`[getUserProfile] User with ID ${userId} not found.`);
        return null;
    }
    return userSnap.data() as UserProfile;
}

// ==================================
// UPDATE ACTIONS
// ==================================
export async function updateObservationStatus({ observationId, actionData, userName, userPosition }: { observationId: string, actionData: { actionTakenDescription: string, actionTakenPhotoUrl?: string }, userName: string, userPosition: string }): Promise<Observation> {
  const observationDocRef = adminDb.collection('observations').doc(observationId);
  const docSnap = await observationDocRef.get();
  if (!docSnap.exists) {
    throw new Error('Laporan observasi tidak ditemukan. Laporan ini mungkin telah dihapus.');
  }
  const observation = docSnap.data() as Observation;

  const closerName = `${userName} (${userPosition || 'N/A'})`;
  const updatedData: Partial<Observation> = {
      status: 'Completed',
      actionTakenDescription: actionData.actionTakenDescription,
      closedBy: closerName,
      closedDate: new Date().toISOString(),
  };

  if (actionData.actionTakenPhotoUrl) {
      updatedData.actionTakenPhotoUrl = actionData.actionTakenPhotoUrl;
  }
  
  await observationDocRef.update(updatedData);
  const updatedDocSnap = await observationDocRef.get();
  const finalDocData = updatedDocSnap.data() as Omit<Observation, 'id'>;

  // Revalidate paths
  if (observation.scope === 'project' && observation.projectId) revalidatePath(`/proyek/${observation.projectId}`, 'page');
  else if (observation.scope === 'private') revalidatePath('/private', 'page');
  revalidatePath('/tasks', 'page');

  return { ...finalDocData, id: updatedDocSnap.id };
}

export async function updateInspectionStatus({ inspectionId, actionData, userName, userPosition }: { inspectionId: string, actionData: { actionTakenDescription: string, actionTakenPhotoUrl?: string }, userName: string, userPosition: string }): Promise<Inspection> {
    const inspectionDocRef = adminDb.collection('inspections').doc(inspectionId);
    const docSnap = await inspectionDocRef.get();
    if (!docSnap.exists) {
        throw new Error('Laporan inspeksi tidak ditemukan. Laporan ini mungkin telah dihapus.');
    }
    const inspection = docSnap.data() as Inspection;

    const closerName = `${userName} (${userPosition || 'N/A'})`;
    const updatedData: Partial<Inspection> = {
        status: 'Pass',
        actionTakenDescription: actionData.actionTakenDescription,
        closedBy: closerName,
        closedDate: new Date().toISOString(),
    };
  
    if (actionData.actionTakenPhotoUrl) {
        updatedData.actionTakenPhotoUrl = actionData.actionTakenPhotoUrl;
    }
  
    await inspectionDocRef.update(updatedData);
    const updatedDocSnap = await inspectionDocRef.get();
    const finalDocData = updatedDocSnap.data() as Omit<Inspection, 'id'>;
    
    if (inspection.scope === 'project' && inspection.projectId) revalidatePath(`/proyek/${inspection.projectId}`, 'page');
    else if (inspection.scope === 'private') revalidatePath('/private', 'page');
    revalidatePath('/tasks', 'page');

    return { ...finalDocData, id: updatedDocSnap.id };
}

export async function approvePtw({ ptwId, signatureDataUrl, approverName, approverPosition }: { ptwId: string, signatureDataUrl: string, approverName: string, approverPosition: string }): Promise<Ptw> {
    const ptwDocRef = adminDb.collection('ptws').doc(ptwId);
    const docSnap = await ptwDocRef.get();
    if (!docSnap.exists) {
        throw new Error('Dokumen PTW tidak ditemukan. Mungkin telah dihapus.');
    }
    const ptw = docSnap.data() as Ptw;

    const approver = `${approverName} (${approverPosition || 'N/A'})`;
    
    await ptwDocRef.update({
        status: 'Approved', signatureDataUrl, approver, approvedDate: new Date().toISOString(),
    });

    const updatedDocSnap = await ptwDocRef.get();
    const finalDocData = updatedDocSnap.data() as Omit<Ptw, 'id'>;

    if (ptw.scope === 'project' && ptw.projectId) revalidatePath(`/proyek/${ptw.projectId}`, 'page');
    else if (ptw.scope === 'private') revalidatePath('/private', 'page');

    return { ...finalDocData, id: updatedDocSnap.id };
}

// ==================================
// DELETE ACTIONS
// ==================================
async function safeDeleteStorageFile(fileUrl: string | undefined | null) {
  if (!fileUrl || !fileUrl.startsWith('https://firebasestorage.googleapis.com')) {
    return;
  }
  try {
    const bucket = adminStorage.bucket();
    const decodedUrl = decodeURIComponent(fileUrl);
    const pathStartIndex = decodedUrl.indexOf('/o/') + 3;
    const pathEndIndex = decodedUrl.indexOf('?');
    if (pathStartIndex === -1 || pathEndIndex === -1) return;
    const filePath = decodedUrl.substring(pathStartIndex, pathEndIndex);

    if (!filePath) return;
    
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    if (exists) await file.delete();
  } catch (error) {
    console.error(`[safeDeleteStorageFile] Non-blocking error deleting file: ${fileUrl}`, error);
  }
}

export async function deleteItem(item: AllItems) {
  const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
  await docRef.delete();

  if (item.itemType === 'observation' || item.itemType === 'inspection') {
    await safeDeleteStorageFile(item.photoUrl);
    if ('actionTakenPhotoUrl' in item) await safeDeleteStorageFile(item.actionTakenPhotoUrl);
  } else if (item.itemType === 'ptw') {
    await safeDeleteStorageFile(item.jsaPdfUrl);
  }
  
  // Revalidate relevant paths
  if (item.scope === 'project' && item.projectId) revalidatePath(`/proyek/${item.projectId}`, 'page');
  else if (item.scope === 'private') revalidatePath('/private', 'page');
  else if (item.scope === 'public') revalidatePath('/public', 'page');
  revalidatePath('/tasks', 'page');
  revalidatePath('/beranda', 'page');
}


export async function deleteMultipleItems(items: AllItems[]) {
  if (items.length === 0) return;

  const batch = adminDb.batch();
  const storageDeletePromises: Promise<any>[] = [];

  for (const item of items) {
    const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
    batch.delete(docRef);
    if (item.itemType === 'observation' || item.itemType === 'inspection') {
      storageDeletePromises.push(safeDeleteStorageFile(item.photoUrl));
      if ('actionTakenPhotoUrl' in item) {
        storageDeletePromises.push(safeDeleteStorageFile(item.actionTakenPhotoUrl));
      }
    } else if (item.itemType === 'ptw') {
      storageDeletePromises.push(safeDeleteStorageFile(item.jsaPdfUrl));
    }
  }

  await Promise.all(storageDeletePromises);
  await batch.commit();

  // Revalidate all potentially affected paths
  revalidatePath('/public', 'page');
  revalidatePath('/private', 'page');
  revalidatePath('/tasks', 'page');
  revalidatePath('/beranda', 'page');
  const projectIds = new Set(items.map(i => i.projectId).filter(Boolean));
  projectIds.forEach(id => revalidatePath(`/proyek/${id}`, 'page'));
}


// ==================================
// AI & OTHER ACTIONS
// ==================================
export async function triggerObservationAnalysis(observation: Observation) {
  const docRef = adminDb.collection('observations').doc(observation.id);

  try {
    const userProfile = await getUserProfile(observation.userId);
    if (!userProfile || !(userProfile.aiEnabled ?? true)) {
        await docRef.update({ aiStatus: 'n/a' });
        return;
    }

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
      }, userProfile).catch(err => {
        console.error(`Smart-notify trigger failed for obs ${observation.id}`, err);
      });
    }

    const analysis = await summarizeObservationData({ observationData }, userProfile);

    const updatePayload: Partial<Observation> = {
      aiStatus: 'completed',
      category: analysis.suggestedCategory,
      aiSuggestedRiskLevel: analysis.suggestedRiskLevel,
      aiSummary: analysis.summary,
      aiObserverSkillRating: analysis.aiObserverSkillRating,
      aiObserverSkillExplanation: analysis.aiObserverSkillExplanation,
    };
    
    const finalDocSnap = await docRef.get();
    if (finalDocSnap.exists()) {
        await docRef.update(updatePayload);
    }
  } catch (error) {
    console.error(`AI analysis failed for observation ${observation.id}:`, error);
    const finalDocSnap = await docRef.get();
    if (finalDocSnap.exists()) {
      await docRef.update({ aiStatus: 'failed' });
    }
  } finally {
      if (observation.projectId) revalidatePath(`/proyek/${observation.projectId}`, 'page');
      else revalidatePath('/private', 'page');
      revalidatePath('/tasks', 'page');
  }
}

export async function runDeeperAnalysis(observationId: string): Promise<Observation> {
    const docRef = adminDb.collection('observations').doc(observationId);
    
    const docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Observasi tidak ditemukan.");
    const observation = docSnap.data() as Observation;

    const userProfile = await getUserProfile(observation.userId);
    if (!userProfile || !(userProfile.aiEnabled ?? true)) {
        await docRef.update({ aiStatus: 'n/a' });
        throw new Error("AI features are disabled for this user.");
    }

    await docRef.update({ aiStatus: 'processing' });
    if (observation.projectId) revalidatePath(`/proyek/${observation.projectId}`, 'page');
    else revalidatePath('/private', 'page');

    try {
        const observationData = `
            Temuan: ${observation.findings}
            Rekomendasi: ${observation.recommendation}
            Lokasi: ${observation.location}
            Perusahaan: ${observation.company}
            Pengamat: ${observation.submittedBy}
            Kategori Awal: ${observation.category}
            Tingkat Risiko Awal: ${observation.riskLevel}
        `;
        
        const deepAnalysis = await analyzeDeeperObservation({ observationData }, userProfile);
        
        const updatePayload: Partial<Observation> = {
            aiStatus: 'completed',
            aiRisks: deepAnalysis.risks,
            aiSuggestedActions: deepAnalysis.suggestedActions,
            aiRootCauseAnalysis: deepAnalysis.rootCauseAnalysis,
            aiRelevantRegulations: deepAnalysis.relevantRegulations,
        };
        
        const finalDocSnap = await docRef.get();
        if (finalDocSnap.exists()) {
            await docRef.update(updatePayload);
        }

        const updatedDoc = await docRef.get();
        if (observation.projectId) revalidatePath(`/proyek/${observation.projectId}`, 'page');
        else revalidatePath('/private', 'page');
        
        return { ...updatedDoc.data(), id: updatedDoc.id } as Observation;

    } catch (error) {
        console.error(`Deeper AI analysis failed for observation ${observationId}:`, error);
        const finalDocSnap = await docRef.get();
        if (finalDocSnap.exists()) {
            await docRef.update({ aiStatus: 'failed' });
        }
        throw error;
    }
}

export async function triggerInspectionAnalysis(inspection: Inspection) {
  const docRef = adminDb.collection('inspections').doc(inspection.id);

  try {
    const userProfile = await getUserProfile(inspection.userId);
    if (!userProfile || !(userProfile.aiEnabled ?? true)) {
        await docRef.update({ aiStatus: 'n/a' });
        return;
    }
    
    await docRef.update({ aiStatus: 'processing' });
    if (inspection.projectId) revalidatePath(`/proyek/${inspection.projectId}`, 'page');
    else revalidatePath('/private', 'page');

    const inspectionData = `
      Nama Peralatan: ${inspection.equipmentName}
      Jenis Peralatan: ${inspection.equipmentType}
      Temuan: ${inspection.findings}
      Rekomendasi: ${inspection.recommendation || 'Tidak ada'}
      Lokasi: ${inspection.location}
      Status Laporan: ${inspection.status}
      Penginspeksi: ${inspection.submittedBy}
    `;

    const analysis = await analyzeInspectionData({ inspectionData }, userProfile);

    const updatePayload = {
      aiStatus: 'completed',
      aiSummary: analysis.summary,
    };
    
    const finalDocSnap = await docRef.get();
    if (finalDocSnap.exists()) {
        await docRef.update(updatePayload);
    }
  } catch (error) {
    console.error(`AI analysis failed for inspection ${inspection.id}:`, error);
    const finalDocSnap = await docRef.get();
    if (finalDocSnap.exists()) {
        await docRef.update({ aiStatus: 'failed' });
    }
  } finally {
    if (inspection.projectId) revalidatePath(`/proyek/${inspection.projectId}`, 'page');
    else revalidatePath('/private', 'page');
  }
}

export async function runDeeperInspectionAnalysis(inspectionId: string): Promise<Inspection> {
    const docRef = adminDb.collection('inspections').doc(inspectionId);
    
    const docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Inspeksi tidak ditemukan.");
    const inspection = docSnap.data() as Inspection;

    const userProfile = await getUserProfile(inspection.userId);
    if (!userProfile || !(userProfile.aiEnabled ?? true)) {
        await docRef.update({ aiStatus: 'n/a' });
        throw new Error("AI features are disabled for this user.");
    }

    await docRef.update({ aiStatus: 'processing' });
    if (inspection.projectId) revalidatePath(`/proyek/${inspection.projectId}`, 'page');
    else revalidatePath('/private', 'page');

    try {
        const inspectionData = `
          Nama Peralatan: ${inspection.equipmentName}
          Jenis Peralatan: ${inspection.equipmentType}
          Temuan: ${inspection.findings}
          Rekomendasi: ${inspection.recommendation || 'Tidak ada'}
          Lokasi: ${inspection.location}
          Status Laporan: ${inspection.status}
          Penginspeksi: ${inspection.submittedBy}
        `;
        
        const deepAnalysis = await analyzeDeeperInspection({ inspectionData }, userProfile);
        
        const updatePayload: Partial<Inspection> = {
            aiStatus: 'completed',
            aiSummary: deepAnalysis.summary,
            aiRisks: deepAnalysis.risks,
            aiSuggestedActions: deepAnalysis.suggestedActions,
        };
        
        const finalDocSnap = await docRef.get();
        if (finalDocSnap.exists()) {
            await docRef.update(updatePayload);
        }

        const updatedDoc = await docRef.get();
        if (inspection.projectId) revalidatePath(`/proyek/${inspection.projectId}`, 'page');
        else revalidatePath('/private', 'page');
        
        return { ...updatedDoc.data(), id: updatedDoc.id } as Inspection;

    } catch (error) {
        console.error(`Deeper AI analysis failed for inspection ${inspectionId}:`, error);
        const finalDocSnap = await docRef.get();
        if (finalDocSnap.exists()) {
            await docRef.update({ aiStatus: 'failed' });
        }
        throw error;
    }
}


export async function retryAiAnalysis(item: Observation | Inspection) {
    const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
    
    const docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Item not found for AI retry.");
    const currentItem = docSnap.data() as AllItems;
    
    await docRef.update({ aiStatus: 'pending' }); // Reset status to allow re-triggering

    if (currentItem.itemType === 'observation') {
      await triggerObservationAnalysis(currentItem as Observation);
    } else if (currentItem.itemType === 'inspection') {
      await triggerInspectionAnalysis(currentItem as Inspection);
    }
    const updatedDoc = await docRef.get();
    return { ...updatedDoc.data(), id: updatedDoc.id } as AllItems;
}

export async function shareObservationToPublic(observation: Observation, userProfile: UserProfile): Promise<{ updatedOriginal: Observation; newPublicItem: Observation }> {
    if (observation.isSharedPublicly) {
        throw new Error("Laporan ini sudah dibagikan.");
    }
    
    const publicObservationData: Omit<Observation, 'id' | 'actionTakenDescription' | 'actionTakenPhotoUrl' | 'closedBy' | 'closedDate' > = {
        itemType: 'observation',
        userId: observation.userId,
        referenceId: observation.referenceId,
        location: observation.location,
        submittedBy: observation.submittedBy,
        date: new Date().toISOString(), // Use current date for sharing
        findings: observation.findings,
        recommendation: observation.recommendation,
        riskLevel: observation.riskLevel,
        status: 'Pending', // Public observations have their own lifecycle
        category: observation.category,
        company: observation.company,
        photoUrl: observation.photoUrl,
        scope: 'public',
        projectId: null, // Public items don't belong to a project
        aiStatus: observation.aiStatus,
        aiSummary: observation.aiSummary,
        aiSuggestedRiskLevel: observation.aiSuggestedRiskLevel,
        aiRisks: observation.aiRisks,
        aiSuggestedActions: observation.aiSuggestedActions,
        aiRelevantRegulations: observation.aiRelevantRegulations,
        aiRootCauseAnalysis: observation.aiRootCauseAnalysis,
        aiObserverSkillRating: observation.aiObserverSkillRating,
        aiObserverSkillExplanation: observation.aiObserverSkillExplanation,
        isSharedPublicly: false, // The public copy itself is not 'shared'
        sharedBy: userProfile.displayName,
        sharedByPosition: userProfile.position,
        originalId: observation.id,
        originalScope: observation.scope,
        likes: [],
        likeCount: 0,
        commentCount: 0,
        viewCount: 0,
    };
    
    const originalDocRef = adminDb.collection('observations').doc(observation.id);
    const newPublicDocRef = adminDb.collection('observations').doc();

    const batch = adminDb.batch();
    batch.set(newPublicDocRef, publicObservationData);
    batch.update(originalDocRef, { isSharedPublicly: true });
    
    await batch.commit();
    
    revalidatePath('/public', 'page');
    if (observation.projectId) revalidatePath(`/proyek/${observation.projectId}`, 'page');
    else revalidatePath('/private', 'page');
    
    const updatedDocSnap = await originalDocRef.get();
    if (!updatedDocSnap.exists()) {
        throw new Error("Dokumen asli tidak ditemukan setelah dibagikan.");
    }

    const newPublicDocSnap = await newPublicDocRef.get();
    if (!newPublicDocSnap.exists()) {
        throw new Error("Dokumen publik yang baru dibuat tidak ditemukan.");
    }
    
    return {
        updatedOriginal: { ...updatedDocSnap.data(), id: updatedDocSnap.id } as Observation,
        newPublicItem: { ...newPublicDocSnap.data(), id: newPublicDocSnap.id } as Observation,
    };
}
