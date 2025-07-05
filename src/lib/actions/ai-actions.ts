
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { Observation, Inspection, UserProfile } from '@/lib/types';
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


// ==================================
// AI ACTIONS
// ==================================
export async function triggerObservationAnalysis(observation: Observation) {
  const docRef = adminDb.collection('observations').doc(observation.id);
  const userProfile = await getUserProfile(observation.userId);
  if (!userProfile || !userProfile.aiEnabled) {
      return docRef.update({ aiStatus: 'n/a' });
  }

  await docRef.update({ aiStatus: 'processing' });

  const observationData = `Temuan: ${observation.findings}\nRekomendasi: ${observation.recommendation}\nLokasi: ${observation.location}\nPerusahaan: ${observation.company}`;

  try {
    const classification = await runFastClassification({ observationData }, userProfile);
    const docExists = (await docRef.get()).exists;
    if (docExists) {
        await docRef.update({
            category: classification.suggestedCategory,
            riskLevel: classification.suggestedRiskLevel,
            aiSuggestedRiskLevel: classification.suggestedRiskLevel,
        });
    }
  } catch (error) {
    console.error(`Fast classification failed for obs ${observation.id}:`, error);
    const docExists = (await docRef.get()).exists;
    if (docExists) {
        await docRef.update({ aiStatus: 'failed' });
    }
    return;
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
}

export async function runDeeperAnalysis(observationId: string): Promise<Observation> {
    const docRef = adminDb.collection('observations').doc(observationId);
    let docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Observasi tidak ditemukan.");
    const observation = docSnap.data() as Observation;

    const userProfile = await getUserProfile(observation.userId);
    if (!userProfile || !userProfile.aiEnabled) throw new Error("AI features are disabled for this user.");

    await docRef.update({ aiStatus: 'processing' });

    try {
        const observationData = `Temuan: ${observation.findings}\nRekomendasi: ${observation.recommendation}\nKategori Awal: ${observation.category}`;
        const deepAnalysis = await analyzeDeeperObservation({ observationData }, userProfile);
        
        docSnap = await docRef.get();
        if (!docSnap.exists) {
          console.log(`[runDeeperAnalysis] Observation ${observationId} deleted during analysis. Aborting update.`);
          return observation; 
        }
        
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
        return finalData;
    } catch (error) {
        console.error(`Deeper AI analysis failed for observation ${observationId}:`, error);
        docSnap = await docRef.get();
        if (docSnap.exists) {
            await docRef.update({ aiStatus: 'failed' });
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

  try {
    const inspectionData = `Nama Peralatan: ${inspection.equipmentName}\nJenis: ${inspection.equipmentType}\nTemuan: ${inspection.findings}\nRekomendasi: ${inspection.recommendation || 'N/A'}`;
    const analysis = await analyzeInspectionData({ inspectionData }, userProfile);

    const docExists = (await docRef.get()).exists;
    if (docExists) {
        await docRef.update({ 
            aiStatus: 'completed', 
            aiSummary: analysis.summary 
        });
    }
  } catch (error) {
    console.error(`AI analysis failed for inspection ${inspection.id}:`, error);
    const docExists = (await docRef.get()).exists;
    if (docExists) {
        await docRef.update({ aiStatus: 'failed' });
    }
  }
}

export async function runDeeperInspectionAnalysis(inspectionId: string): Promise<Inspection> {
    const docRef = adminDb.collection('inspections').doc(inspectionId);
    let docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Inspeksi tidak ditemukan.");
    const inspection = docSnap.data() as Inspection;

    const userProfile = await getUserProfile(inspection.userId);
    if (!userProfile || !userProfile.aiEnabled) throw new Error("AI features are disabled for this user.");

    await docRef.update({ aiStatus: 'processing' });

    try {
        const inspectionData = `Nama Peralatan: ${inspection.equipmentName}\nJenis: ${inspection.equipmentType}\nTemuan: ${inspection.findings}\nRekomendasi: ${inspection.recommendation || 'N/A'}`;
        const deepAnalysis = await analyzeDeeperInspection({ inspectionData }, userProfile);
        
        docSnap = await docRef.get();
        if (!docSnap.exists) {
            console.log(`[runDeeperInspectionAnalysis] Inspection ${inspectionId} deleted during analysis. Aborting update.`);
            return inspection;
        }

        await docRef.update({
            aiStatus: 'completed',
            aiSummary: deepAnalysis.summary,
            aiRisks: deepAnalysis.risks,
            aiSuggestedActions: deepAnalysis.suggestedActions,
        });
        
        const updatedDoc = await docRef.get();
        const finalData = { ...updatedDoc.data(), id: updatedDoc.id } as Inspection;
        return finalData;
    } catch (error) {
        console.error(`Deeper AI analysis failed for inspection ${inspectionId}:`, error);
        docSnap = await docRef.get();
        if (docSnap.exists) {
            await docRef.update({ aiStatus: 'failed' });
        }
        throw error;
    }
}

export async function retryAiAnalysis(item: Observation | Inspection): Promise<Observation | Inspection> {
    const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Item not found for AI retry.");
    
    if (item.itemType === 'observation') {
      await triggerObservationAnalysis(item as Observation);
    } else if (item.itemType === 'inspection') {
      await triggerInspectionAnalysis(item as Inspection);
    }
    const updatedDoc = await docRef.get();
    const finalData = { ...updatedDoc.data(), id: updatedDoc.id } as Observation | Inspection;
    return finalData;
}

export async function shareObservationToPublic(observation: Observation, userProfile: UserProfile): Promise<{ updatedOriginal: Observation; newPublicItem: Observation }> {
    if (observation.isSharedPublicly) throw new Error("Laporan ini sudah dibagikan.");
    
    const originalDocRef = adminDb.collection('observations').doc(observation.id);
    
    const originalSnap = await originalDocRef.get();
    if (!originalSnap.exists) throw new Error("Laporan asli tidak dapat ditemukan untuk dibagikan.");

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
    
    const newPublicDocRef = adminDb.collection('observations').doc();
    const batch = adminDb.batch();
    batch.set(newPublicDocRef, publicObservationData);
    batch.update(originalDocRef, { isSharedPublicly: true });
    
    await batch.commit();
    
    const updatedDocSnap = await originalDocRef.get();
    const newPublicDocSnap = await newPublicDocRef.get();
    if (!updatedDocSnap.exists() || !newPublicDocSnap.exists()) {
        throw new Error("Gagal memverifikasi pembuatan laporan publik.");
    }

    const updatedOriginal = { ...updatedDocSnap.data(), id: updatedDocSnap.id } as Observation;
    const newPublicItem = { ...newPublicDocSnap.data(), id: newPublicDocSnap.id } as Observation;
    
    return { updatedOriginal, newPublicItem };
}
