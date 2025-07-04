
'use server';

import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { Observation, Inspection, Ptw, AllItems, UserProfile } from '@/lib/types';
import { summarizeObservationData, analyzeDeeperObservation, analyzeDeeperInspection } from '@/ai/flows/summarize-observation-data';
import { analyzeInspectionData } from '@/ai/flows/summarize-observation-data';
import { triggerSmartNotify } from '@/ai/flows/smart-notify-flow';


// ==================================
// UPDATE ACTIONS
// ==================================
export async function updateObservationStatus({ observationId, actionData, userName, userPosition }: { observationId: string, actionData: { actionTakenDescription: string, actionTakenPhotoUrl?: string }, userName: string, userPosition: string }): Promise<Observation> {
  try {
    const closerName = `${userName} (${userPosition || 'N/A'})`;
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
      throw new Error('Laporan observasi tidak ditemukan setelah pembaruan. Laporan ini mungkin telah dihapus secara bersamaan.');
    }
  
    const finalDocData = updatedDocSnap.data() as Omit<Observation, 'id'>;
    const projectId = finalDocData?.projectId;
  
    if (projectId) revalidatePath(`/proyek/${projectId}`, 'page');
    else revalidatePath('/private', 'page');
    revalidatePath('/tasks', 'page');

    return { ...finalDocData, id: updatedDocSnap.id };
  } catch (error) {
    console.error(`[Server Action - updateObservationStatus] Failed for observation ${observationId}:`, error);
    throw new Error('Gagal memperbarui status observasi di server.');
  }
}

export async function updateInspectionStatus({ inspectionId, actionData, userName, userPosition }: { inspectionId: string, actionData: { actionTakenDescription: string, actionTakenPhotoUrl?: string }, userName: string, userPosition: string }): Promise<Inspection> {
  try {
    const closerName = `${userName} (${userPosition || 'N/A'})`;
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
      throw new Error('Laporan inspeksi tidak ditemukan setelah pembaruan. Laporan ini mungkin telah dihapus secara bersamaan.');
    }
  
    const finalDocData = updatedDocSnap.data() as Omit<Inspection, 'id'>;
    const projectId = finalDocData?.projectId;
    
    if (projectId) revalidatePath(`/proyek/${projectId}`, 'page');
    else revalidatePath('/private', 'page');
    revalidatePath('/tasks', 'page');

    return { ...finalDocData, id: updatedDocSnap.id };
  } catch (error) {
    console.error(`[Server Action - updateInspectionStatus] Failed for inspection ${inspectionId}:`, error);
    throw new Error('Gagal memperbarui status inspeksi di server.');
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
        throw new Error('Dokumen PTW tidak ditemukan setelah pembaruan. Mungkin telah dihapus secara bersamaan.');
      }
    
      const finalDocData = updatedDocSnap.data() as Omit<Ptw, 'id'>;
      const projectId = finalDocData?.projectId;
  
      if (projectId) revalidatePath(`/proyek/${projectId}`, 'page');
      else revalidatePath('/private', 'page');

      return { ...finalDocData, id: updatedDocSnap.id };
    } catch (error) {
      console.error(`[Server Action - approvePtw] Failed for PTW ${ptwId}:`, error);
      throw new Error('Gagal menyetujui PTW di server.');
    }
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
    // Extract the full path from the URL
    const decodedUrl = decodeURIComponent(fileUrl);
    const pathStartIndex = decodedUrl.indexOf('/o/') + 3;
    const pathEndIndex = decodedUrl.indexOf('?');
    const filePath = decodedUrl.substring(pathStartIndex, pathEndIndex);

    if (!filePath) return;
    
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    if (exists) await file.delete();
  } catch (error) {
    console.error(`[safeDeleteStorageFile] An unexpected error occurred while trying to delete file at ${fileUrl}. This may be a non-blocking error if the file was already deleted. Error:`, error);
  }
}

export async function deleteItem(item: AllItems) {
  try {
    const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
    await docRef.delete();

    if (item.itemType === 'observation' || item.itemType === 'inspection') {
      await safeDeleteStorageFile(item.photoUrl);
      if ('actionTakenPhotoUrl' in item) await safeDeleteStorageFile(item.actionTakenPhotoUrl);
    } else if (item.itemType === 'ptw') {
      await safeDeleteStorageFile(item.jsaPdfUrl);
    }
    
    revalidatePath('/public', 'page');
    revalidatePath('/private', 'page');
    revalidatePath('/tasks', 'page');
    revalidatePath('/beranda', 'page');
    if (item.projectId) revalidatePath(`/proyek/${item.projectId}`, 'page');

  } catch (error) {
    console.error(`[deleteItem Action] Failed to delete item ${item.id}:`, error);
    throw new Error('Gagal menghapus laporan dari database.');
  }
}

export async function deleteMultipleItems(items: AllItems[]) {
  if (items.length === 0) return;

  try {
    const batch = adminDb.batch();
    const deletePromises = items.map(item => {
      const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
      batch.delete(docRef);
      if (item.itemType === 'observation' || item.itemType === 'inspection') {
        return Promise.all([
            safeDeleteStorageFile(item.photoUrl),
            'actionTakenPhotoUrl' in item ? safeDeleteStorageFile(item.actionTakenPhotoUrl) : Promise.resolve()
        ]);
      } else if (item.itemType === 'ptw') {
        return safeDeleteStorageFile(item.jsaPdfUrl);
      }
      return Promise.resolve();
    });

    await Promise.all(deletePromises);
    await batch.commit();

    revalidatePath('/public', 'page');
    revalidatePath('/private', 'page');
    revalidatePath('/tasks', 'page');
    revalidatePath('/beranda', 'page');
    const projectIds = new Set(items.map(i => i.projectId).filter(Boolean));
    projectIds.forEach(id => revalidatePath(`/proyek/${id}`, 'page'));
    
  } catch (error) {
    console.error(`[deleteMultipleItems Action] Failed to delete items:`, error);
    throw new Error('Gagal menghapus laporan yang dipilih dari database.');
  }
}


// ==================================
// AI & OTHER ACTIONS
// ==================================
export async function triggerObservationAnalysis(observation: Observation) {
  const docRef = adminDb.collection('observations').doc(observation.id);

  try {
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      console.error(`[AI Trigger] Observation ${observation.id} does not exist.`);
      return;
    }
    const currentData = docSnap.data() as Observation;
    // This is the gatekeeper logic: if analysis is done or in progress, stop immediately.
    if (currentData.aiStatus === 'completed' || currentData.aiStatus === 'processing') {
      console.log(`[AI Trigger] Analysis for observation ${observation.id} already processed. Skipping.`);
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
      if (observation.projectId) revalidatePath(`/proyek/${observation.projectId}`, 'page');
      else revalidatePath('/private', 'page');
      revalidatePath('/tasks', 'page');
  }
}

export async function runDeeperAnalysis(observationId: string): Promise<Observation> {
    const docRef = adminDb.collection('observations').doc(observationId);
    
    try {
        const docSnap = await docRef.get();
        if (!docSnap.exists) throw new Error("Observasi tidak ditemukan.");
        const observation = docSnap.data() as Observation;

        await docRef.update({ aiStatus: 'processing' });
        if (observation.projectId) revalidatePath(`/proyek/${observation.projectId}`, 'page');
        else revalidatePath('/private', 'page');

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
        if (observation.projectId) revalidatePath(`/proyek/${observation.projectId}`, 'page');
        else revalidatePath('/private', 'page');
        
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
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        console.error(`[AI Trigger] Inspection ${inspection.id} does not exist.`);
        return;
    }
    const currentData = docSnap.data() as Inspection;
    // Gatekeeper logic for inspections
    if (currentData.aiStatus === 'completed' || currentData.aiStatus === 'processing') {
        console.log(`[AI Trigger] Analysis for inspection ${inspection.id} already processed. Skipping.`);
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

    const analysis = await analyzeInspectionData({ inspectionData });

    const updatePayload = {
      aiStatus: 'completed',
      aiSummary: analysis.summary,
    };

    await docRef.update(updatePayload);

  } catch (error) {
    console.error(`AI analysis failed for inspection ${inspection.id}:`, error);
    await docRef.update({ aiStatus: 'failed' });
  } finally {
    if (inspection.projectId) revalidatePath(`/proyek/${inspection.projectId}`, 'page');
    else revalidatePath('/private', 'page');
  }
}

export async function runDeeperInspectionAnalysis(inspectionId: string): Promise<Inspection> {
    const docRef = adminDb.collection('inspections').doc(inspectionId);
    
    try {
        const docSnap = await docRef.get();
        if (!docSnap.exists) throw new Error("Inspeksi tidak ditemukan.");
        const inspection = docSnap.data() as Inspection;

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
        
        const deepAnalysis = await analyzeDeeperInspection({ inspectionData });
        
        const updatePayload: Partial<Inspection> = {
            aiStatus: 'completed',
            aiSummary: deepAnalysis.summary,
            aiRisks: deepAnalysis.risks,
            aiSuggestedActions: deepAnalysis.suggestedActions,
        };
        
        await docRef.update(updatePayload);
        const updatedDoc = await docRef.get();
        if (inspection.projectId) revalidatePath(`/proyek/${inspection.projectId}`, 'page');
        else revalidatePath('/private', 'page');
        
        return { ...updatedDoc.data(), id: updatedDoc.id } as Inspection;

    } catch (error) {
        console.error(`Deeper AI analysis failed for inspection ${inspectionId}:`, error);
        await docRef.update({ aiStatus: 'failed' });
        throw error;
    }
}


export async function retryAiAnalysis(item: Observation | Inspection) {
    const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
    await docRef.update({ aiStatus: 'pending' }); // Reset status to allow re-triggering

    if (item.itemType === 'observation') {
      await triggerObservationAnalysis(item);
    } else if (item.itemType === 'inspection') {
      await triggerInspectionAnalysis(item);
    }
    const updatedDoc = await docRef.get();
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

  delete (publicObservationData as any).id;
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
  if (observation.projectId) revalidatePath(`/proyek/${observation.projectId}`, 'page');
  else revalidatePath('/private', 'page');
  
  const updatedDoc = await originalDocRef.get();
  return { ...updatedDoc.data(), id: updatedDoc.id } as Observation;
}
