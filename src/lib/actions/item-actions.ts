
'use server';

import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { Observation, Inspection, Ptw, AllItems, UserProfile, Scope } from '@/lib/types';
import { 
    runFastClassification, 
    analyzeDeeperObservation, 
    analyzeDeeperInspection, 
    analyzeInspectionData 
} from '@/ai/flows/summarize-observation-data';
import { triggerSmartNotify } from '@/ai/flows/smart-notify-flow';

// ==================================
// HELPER FUNCTIONS
// ==================================

/**
 * Gets a user's profile from Firestore.
 * @param userId The UID of the user.
 * @returns The user profile object or null if not found.
 */
async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        console.warn(`[getUserProfile] User with ID ${userId} not found.`);
        return null;
    }
    return userSnap.data() as UserProfile;
}

/**
 * Revalidates Next.js cache paths based on the item's scope.
 * @param item The item that was changed.
 */
function revalidateRelevantPaths(item: { scope: Scope; projectId?: string | null }) {
    if (item.scope === 'project' && item.projectId) revalidatePath(`/proyek/${item.projectId}`, 'page');
    else if (item.scope === 'private') revalidatePath('/private', 'page');
    else if (item.scope === 'public') revalidatePath('/public', 'page');
    revalidatePath('/tasks', 'page'); // Always revalidate dashboard
}


// ==================================
// UPDATE ACTIONS
// ==================================
export async function updateObservationStatus({ observationId, actionData, userName, userPosition }: { observationId: string, actionData: { actionTakenDescription: string, actionTakenPhotoUrl?: string }, userName: string, userPosition: string }): Promise<Observation> {
  const observationDocRef = adminDb.collection('observations').doc(observationId);
  const docSnap = await observationDocRef.get();
  if (!docSnap.exists) throw new Error('Laporan observasi tidak ditemukan.');
  
  const observation = docSnap.data() as Observation;

  const closerName = `${userName} (${userPosition || 'N/A'})`;
  const updatedData: Partial<Observation> = {
      status: 'Completed',
      actionTakenDescription: actionData.actionTakenDescription,
      closedBy: closerName,
      closedDate: new Date().toISOString(),
  };
  if (actionData.actionTakenPhotoUrl) updatedData.actionTakenPhotoUrl = actionData.actionTakenPhotoUrl;
  
  await observationDocRef.update(updatedData);
  const updatedDocSnap = await observationDocRef.get();
  const finalDocData = { ...updatedDocSnap.data(), id: updatedDocSnap.id } as Observation;

  revalidateRelevantPaths(observation);
  return finalDocData;
}

export async function updateInspectionStatus({ inspectionId, actionData, userName, userPosition }: { inspectionId: string, actionData: { actionTakenDescription: string, actionTakenPhotoUrl?: string }, userName: string, userPosition: string }): Promise<Inspection> {
    const inspectionDocRef = adminDb.collection('inspections').doc(inspectionId);
    const docSnap = await inspectionDocRef.get();
    if (!docSnap.exists) throw new Error('Laporan inspeksi tidak ditemukan.');
    const inspection = docSnap.data() as Inspection;

    const closerName = `${userName} (${userPosition || 'N/A'})`;
    const updatedData: Partial<Inspection> = {
        status: 'Pass',
        actionTakenDescription: actionData.actionTakenDescription,
        closedBy: closerName,
        closedDate: new Date().toISOString(),
    };
    if (actionData.actionTakenPhotoUrl) updatedData.actionTakenPhotoUrl = actionData.actionTakenPhotoUrl;
  
    await inspectionDocRef.update(updatedData);
    const updatedDocSnap = await inspectionDocRef.get();
    const finalDocData = { ...updatedDocSnap.data(), id: updatedDocSnap.id } as Inspection;
    
    revalidateRelevantPaths(inspection);
    return finalDocData;
}

export async function approvePtw({ ptwId, signatureDataUrl, approverName, approverPosition }: { ptwId: string, signatureDataUrl: string, approverName: string, approverPosition: string }): Promise<Ptw> {
    const ptwDocRef = adminDb.collection('ptws').doc(ptwId);
    const docSnap = await ptwDocRef.get();
    if (!docSnap.exists) throw new Error('Dokumen PTW tidak ditemukan.');
    const ptw = docSnap.data() as Ptw;

    const approver = `${approverName} (${approverPosition || 'N/A'})`;
    await ptwDocRef.update({
        status: 'Approved', signatureDataUrl, approver, approvedDate: new Date().toISOString(),
    });
    const updatedDocSnap = await ptwDocRef.get();
    const finalDocData = { ...updatedDocSnap.data(), id: updatedDocSnap.id } as Ptw;

    revalidateRelevantPaths(ptw);
    return finalDocData;
}

// ==================================
// DELETE ACTIONS
// ==================================
async function safeDeleteStorageFile(fileUrl: string | undefined | null) {
  if (!fileUrl || !fileUrl.startsWith('https://firebasestorage.googleapis.com')) return;
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

export async function deleteItem(item: AllItems): Promise<{id: string}> {
  const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
  await docRef.delete();

  if (item.itemType === 'observation' || item.itemType === 'inspection') {
    await safeDeleteStorageFile(item.photoUrl);
    if ('actionTakenPhotoUrl' in item) await safeDeleteStorageFile(item.actionTakenPhotoUrl);
  } else if (item.itemType === 'ptw') {
    await safeDeleteStorageFile(item.jsaPdfUrl);
  }
  
  revalidateRelevantPaths(item);
  revalidatePath('/beranda', 'page');
  return { id: item.id };
}


export async function deleteMultipleItems(items: AllItems[]): Promise<{deletedIds: string[]}> {
  if (items.length === 0) return { deletedIds: [] };

  const batch = adminDb.batch();
  const storageDeletePromises: Promise<any>[] = [];
  const deletedIds: string[] = [];

  for (const item of items) {
    const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
    batch.delete(docRef);
    deletedIds.push(item.id);

    if (item.itemType === 'observation' || item.itemType === 'inspection') {
      storageDeletePromises.push(safeDeleteStorageFile(item.photoUrl));
      if ('actionTakenPhotoUrl' in item) storageDeletePromises.push(safeDeleteStorageFile(item.actionTakenPhotoUrl));
    } else if (item.itemType === 'ptw') {
      storageDeletePromises.push(safeDeleteStorageFile(item.jsaPdfUrl));
    }
  }

  await Promise.all(storageDeletePromises);
  await batch.commit();

  revalidatePath('/public', 'page');
  revalidatePath('/private', 'page');
  revalidatePath('/tasks', 'page');
  revalidatePath('/beranda', 'page');
  const projectIds = new Set(items.map(i => i.projectId).filter(Boolean));
  projectIds.forEach(id => revalidatePath(`/proyek/${id}`, 'page'));
  
  return { deletedIds };
}


// ==================================
// AI & OTHER ACTIONS
// ==================================
export async function triggerObservationAnalysis(observation: Observation) {
  const docRef = adminDb.collection('observations').doc(observation.id);
  const userProfile = await getUserProfile(observation.userId);
  if (!userProfile || !userProfile.aiEnabled) {
      return docRef.update({ aiStatus: 'n/a' });
  }

  await docRef.update({ aiStatus: 'processing' });
  revalidateRelevantPaths(observation);

  const observationData = `Temuan: ${observation.findings}\nRekomendasi: ${observation.recommendation}\nLokasi: ${observation.location}\nPerusahaan: ${observation.company}`;

  // PHASE 1: Fast classification. We await this to get immediate user feedback.
  try {
    const classification = await runFastClassification({ observationData }, userProfile);
    const docExists = (await docRef.get()).exists;
    if (docExists) {
        await docRef.update({
            category: classification.suggestedCategory,
            riskLevel: classification.suggestedRiskLevel, // Update main risk level
            aiSuggestedRiskLevel: classification.suggestedRiskLevel,
        });
        revalidateRelevantPaths(observation);
    }
  } catch (error) {
    console.error(`Fast classification failed for obs ${observation.id}:`, error);
    const docExists = (await docRef.get()).exists;
    if (docExists) {
        await docRef.update({ aiStatus: 'failed' });
        revalidateRelevantPaths(observation);
    }
    return; // Stop if the critical first step fails.
  }

  // PHASE 2 & 3: Background analysis and notifications (fire-and-forget).
  const runBackgroundTasks = async () => {
    try {
      const analysis = await analyzeDeeperObservation({ observationData }, userProfile);
      const docExists = (await docRef.get()).exists;
      if (docExists) {
          await docRef.update({
              aiStatus: 'completed',
              aiSummary: analysis.summary,
              aiObserverSkillRating: analysis.aiObserverSkillRating,
              aiObserverSkillExplanation: analysis.aiObserverSkillExplanation,
              aiRisks: analysis.risks,
              aiSuggestedActions: analysis.suggestedActions,
              aiRootCauseAnalysis: analysis.rootCauseAnalysis,
              aiRelevantRegulations: analysis.relevantRegulations,
          });
          revalidateRelevantPaths(observation);
      }
    } catch (error) {
        console.error(`Background analysis failed for obs ${observation.id}:`, error);
        const docSnap = await docRef.get();
        if (docSnap.exists && docSnap.data()?.aiStatus !== 'completed') {
            await docRef.update({ aiStatus: 'failed' });
            revalidateRelevantPaths(observation);
        }
    }

    if (observation.scope === 'project' && observation.projectId) {
      triggerSmartNotify({
        observationId: observation.id,
        projectId: observation.projectId,
        company: observation.company,
        findings: observation.findings,
        submittedBy: observation.submittedBy.split(' (')[0],
      }, userProfile).catch(err => console.error(`Smart-notify failed for obs ${observation.id}`, err));
    }
  };

  runBackgroundTasks();
}

export async function runDeeperAnalysis(observationId: string): Promise<Observation> {
    const docRef = adminDb.collection('observations').doc(observationId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Observasi tidak ditemukan.");
    const observation = docSnap.data() as Observation;

    const userProfile = await getUserProfile(observation.userId);
    if (!userProfile || !userProfile.aiEnabled) throw new Error("AI features are disabled for this user.");

    await docRef.update({ aiStatus: 'processing' });
    revalidateRelevantPaths(observation);

    try {
        const observationData = `Temuan: ${observation.findings}\nRekomendasi: ${observation.recommendation}\nKategori Awal: ${observation.category}`;
        const deepAnalysis = await analyzeDeeperObservation({ observationData }, userProfile);
        
        const finalDocSnap = await docRef.get();
        if (!finalDocSnap.exists) throw new Error("Observation was deleted during analysis.");
        
        await docRef.update({
            aiStatus: 'completed',
            aiSummary: deepAnalysis.summary,
            aiObserverSkillRating: deepAnalysis.aiObserverSkillRating,
            aiObserverSkillExplanation: deepAnalysis.aiObserverSkillExplanation,
            aiRisks: deepAnalysis.risks,
            aiSuggestedActions: deepAnalysis.suggestedActions,
            aiRootCauseAnalysis: deepAnalysis.rootCauseAnalysis,
            aiRelevantRegulations: deepAnalysis.relevantRegulations,
        });

        const updatedDoc = await docRef.get();
        const finalData = { ...updatedDoc.data(), id: updatedDoc.id } as Observation;
        revalidateRelevantPaths(finalData);
        return finalData;
    } catch (error) {
        console.error(`Deeper AI analysis failed for observation ${observationId}:`, error);
        const finalDocSnap = await docRef.get();
        if (finalDocSnap.exists) {
            await docRef.update({ aiStatus: 'failed' });
            revalidateRelevantPaths(observation);
        }
        throw error;
    }
}

export async function triggerInspectionAnalysis(inspection: Inspection) {
  const docRef = adminDb.collection('inspections').doc(inspection.id);
  const userProfile = await getUserProfile(inspection.userId);
  if (!userProfile || !userProfile.aiEnabled) {
      return docRef.update({ aiStatus: 'n/a' });
  }
  
  await docRef.update({ aiStatus: 'processing' });
  revalidateRelevantPaths(inspection);

  try {
    const inspectionData = `Nama Peralatan: ${inspection.equipmentName}\nJenis: ${inspection.equipmentType}\nTemuan: ${inspection.findings}\nRekomendasi: ${inspection.recommendation || 'N/A'}`;
    const analysis = await analyzeInspectionData({ inspectionData }, userProfile);

    const docExists = (await docRef.get()).exists;
    if (docExists) {
        await docRef.update({ aiStatus: 'completed', aiSummary: analysis.summary });
        revalidateRelevantPaths(inspection);
    }
  } catch (error) {
    console.error(`AI analysis failed for inspection ${inspection.id}:`, error);
    const docExists = (await docRef.get()).exists;
    if (docExists) {
        await docRef.update({ aiStatus: 'failed' });
        revalidateRelevantPaths(inspection);
    }
  }
}

export async function runDeeperInspectionAnalysis(inspectionId: string): Promise<Inspection> {
    const docRef = adminDb.collection('inspections').doc(inspectionId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Inspeksi tidak ditemukan.");
    const inspection = docSnap.data() as Inspection;

    const userProfile = await getUserProfile(inspection.userId);
    if (!userProfile || !userProfile.aiEnabled) throw new Error("AI features are disabled for this user.");

    await docRef.update({ aiStatus: 'processing' });
    revalidateRelevantPaths(inspection);

    try {
        const inspectionData = `Nama Peralatan: ${inspection.equipmentName}\nJenis: ${inspection.equipmentType}\nTemuan: ${inspection.findings}\nRekomendasi: ${inspection.recommendation || 'N/A'}`;
        const deepAnalysis = await analyzeDeeperInspection({ inspectionData }, userProfile);
        
        const finalDocSnap = await docRef.get();
        if (!finalDocSnap.exists) throw new Error("Inspection was deleted during analysis.");

        await docRef.update({
            aiStatus: 'completed',
            aiSummary: deepAnalysis.summary,
            aiRisks: deepAnalysis.risks,
            aiSuggestedActions: deepAnalysis.suggestedActions,
        });
        
        const updatedDoc = await docRef.get();
        const finalData = { ...updatedDoc.data(), id: updatedDoc.id } as Inspection;
        revalidateRelevantPaths(finalData);
        return finalData;
    } catch (error) {
        console.error(`Deeper AI analysis failed for inspection ${inspectionId}:`, error);
        const finalDocSnap = await docRef.get();
        if (finalDocSnap.exists) {
            await docRef.update({ aiStatus: 'failed' });
            revalidateRelevantPaths(inspection);
        }
        throw error;
    }
}

export async function retryAiAnalysis(item: Observation | Inspection): Promise<AllItems> {
    const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Item not found for AI retry.");
    
    // We don't reset the status here, we just re-trigger the analysis.
    // The analysis function itself will set the status to 'processing'.
    if (item.itemType === 'observation') {
      await triggerObservationAnalysis(item as Observation);
    } else if (item.itemType === 'inspection') {
      await triggerInspectionAnalysis(item as Inspection);
    }
    const updatedDoc = await docRef.get();
    return { ...updatedDoc.data(), id: updatedDoc.id } as AllItems;
}

export async function shareObservationToPublic(observation: Observation, userProfile: UserProfile): Promise<{ updatedOriginal: Observation; newPublicItem: Observation }> {
    if (observation.isSharedPublicly) throw new Error("Laporan ini sudah dibagikan.");
    
    const publicObservationData: Omit<Observation, 'id'|'actionTakenDescription'|'actionTakenPhotoUrl'|'closedBy'|'closedDate'> = {
        itemType: 'observation',
        userId: observation.userId,
        referenceId: observation.referenceId,
        location: observation.location,
        submittedBy: observation.submittedBy,
        date: new Date().toISOString(),
        findings: observation.findings,
        recommendation: observation.recommendation,
        riskLevel: observation.riskLevel,
        status: 'Pending',
        category: observation.category,
        company: observation.company,
        photoUrl: observation.photoUrl,
        scope: 'public',
        projectId: null,
        aiStatus: observation.aiStatus,
        aiSummary: observation.aiSummary,
        aiSuggestedRiskLevel: observation.aiSuggestedRiskLevel,
        aiRisks: observation.aiRisks,
        aiSuggestedActions: observation.aiSuggestedActions,
        aiRelevantRegulations: observation.aiRelevantRegulations,
        aiRootCauseAnalysis: observation.aiRootCauseAnalysis,
        aiObserverSkillRating: observation.aiObserverSkillRating,
        aiObserverSkillExplanation: observation.aiObserverSkillExplanation,
        isSharedPublicly: false,
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
    
    const updatedDocSnap = await originalDocRef.get();
    if (!updatedDocSnap.exists) throw new Error("Dokumen asli tidak ditemukan.");
    const newPublicDocSnap = await newPublicDocRef.get();
    if (!newPublicDocSnap.exists()) throw new Error("Dokumen publik yang baru dibuat tidak ditemukan.");

    const updatedOriginal = { ...updatedDocSnap.data(), id: updatedDocSnap.id } as Observation;
    const newPublicItem = { ...newPublicDocSnap.data(), id: newPublicDocSnap.id } as Observation;

    revalidateRelevantPaths(updatedOriginal);
    revalidateRelevantPaths(newPublicItem);
    
    return { updatedOriginal, newPublicItem };
}
