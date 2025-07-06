
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { Observation, Inspection, UserProfile } from '@/lib/types';
import { 
    analyzeDeeperObservation, 
    analyzeDeeperInspection, 
    analyzeInspectionData,
    summarizeObservationFast
} from '@/ai/flows/summarize-observation-data';
import { triggerSmartNotify } from '@/ai/flows/smart-notify-flow';

/**
 * Gets a user's profile from Firestore.
 * This is a helper function for server-side actions.
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
 * Triggers a fast, lightweight AI summary for a new observation.
 * This function is fire-and-forget. It fetches all necessary data from the DB.
 * @param observationId The ID of the newly created observation document.
 */
export async function triggerObservationAnalysis(observationId: string) {
  const docRef = adminDb.collection('observations').doc(observationId);

  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    console.error(`[triggerObservationAnalysis] Observation with ID ${observationId} not found.`);
    return;
  }
  const observation = { id: docSnap.id, ...docSnap.data() } as Observation;
  
  const userProfile = await getUserProfile(observation.userId);
  if (!userProfile) {
    console.error(`[triggerObservationAnalysis] Submitter profile for user ${observation.userId} not found.`);
    await docRef.update({ aiStatus: 'failed', aiSummary: 'Submitter profile not found.' });
    return;
  }
  
  if (observation.scope === 'project' && observation.projectId && userProfile.aiEnabled) {
    triggerSmartNotify({
      observationId: observation.id,
      projectId: observation.projectId,
      company: observation.company,
      findings: observation.findings,
      riskLevel: observation.riskLevel,
      submitterId: observation.userId,
      submittedByDisplayName: observation.submittedBy.split(' (')[0],
    }, userProfile).catch(err => console.error(`Smart-notify failed for obs ${observation.id}`, err));
  }

  if (!userProfile.aiEnabled) {
      await docRef.update({ aiStatus: 'n/a' });
      return;
  }
  
  await docRef.update({ aiStatus: 'processing' });

  try {
    const observationData = `Temuan: ${observation.findings}\nRekomendasi: ${observation.recommendation}\nKategori Awal: ${observation.category}\nTingkat Risiko: ${observation.riskLevel}`;
    const fastAnalysis = await summarizeObservationFast({ observationData }, userProfile);
    
    const currentDocSnap = await docRef.get();
    if (currentDocSnap.exists) {
        const updatePayload: Partial<Observation> = {
            aiStatus: 'completed',
            aiSummary: fastAnalysis.summary,
        };
        await docRef.update(updatePayload);
    }
  } catch (error) {
    console.error(`Fast summary analysis failed for obs ${observation.id}:`, error);
    const currentDocSnap = await docRef.get();
    if (currentDocSnap.exists) {
        await docRef.update({ aiStatus: 'failed' });
    }
  }
}

/**
 * Triggers deeper, on-demand AI analysis for an observation.
 * @param observationId The ID of the observation to analyze.
 */
export async function runDeeperAnalysis(observationId: string): Promise<Observation> {
    const docRef = adminDb.collection('observations').doc(observationId);
    let docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Observasi tidak ditemukan.");
    const observation = { id: docSnap.id, ...docSnap.data() } as Observation;

    const userProfile = await getUserProfile(observation.userId);
    if (!userProfile) throw new Error("Profil pengguna tidak ditemukan.");

    if (!userProfile.aiEnabled) {
      throw new Error("Fitur AI dinonaktifkan untuk pengguna ini.");
    }

    await docRef.update({ aiStatus: 'processing' });

    try {
        const observationData = `Temuan: ${observation.findings}\nRekomendasi: ${observation.recommendation}\nKategori Awal: ${observation.category}`;
        const deepAnalysis = await analyzeDeeperObservation({ observationData }, userProfile);
        
        docSnap = await docRef.get();
        if (!docSnap.exists) {
          console.log(`[runDeeperAnalysis] Observation ${observationId} deleted during analysis. Aborting update.`);
          return observation; 
        }
        
        const updatePayload: Partial<Observation> = {
            aiStatus: 'completed',
            aiSummary: deepAnalysis.summary,
            aiObserverSkillRating: deepAnalysis.aiObserverSkillRating,
            aiObserverSkillExplanation: deepAnalysis.aiObserverSkillExplanation,
            aiRisks: deepAnalysis.risks,
            aiSuggestedActions: deepAnalysis.suggestedActions,
            aiRootCauseAnalysis: deepAnalysis.rootCauseAnalysis,
            aiRelevantRegulations: deepAnalysis.relevantRegulations,
        };

        await docRef.update(updatePayload);

        return { ...observation, ...updatePayload, id: observation.id };
    } catch (error) {
        console.error(`Deeper AI analysis failed for observation ${observationId}:`, error);
        docSnap = await docRef.get();
        if (docSnap.exists) {
            await docRef.update({ aiStatus: 'failed' });
        }
        throw error;
    }
}

/**
 * Triggers the initial, fast AI analysis for a new inspection.
 * @param inspectionId The ID of the newly created inspection document.
 */
export async function triggerInspectionAnalysis(inspectionId: string) {
  const docRef = adminDb.collection('inspections').doc(inspectionId);
  
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    console.error(`[triggerInspectionAnalysis] Inspection with ID ${inspectionId} not found.`);
    return;
  }
  const inspection = { id: docSnap.id, ...docSnap.data() } as Inspection;

  const userProfile = await getUserProfile(inspection.userId);
  if (!userProfile) {
    console.error(`[triggerInspectionAnalysis] Submitter profile for user ${inspection.userId} not found.`);
    await docRef.update({ aiStatus: 'failed', aiSummary: 'Submitter profile not found.' });
    return;
  }
  
  if (!userProfile.aiEnabled) {
    await docRef.update({ aiStatus: 'n/a' });
    return;
  }

  await docRef.update({ aiStatus: 'processing' });

  try {
    const inspectionData = `Nama Peralatan: ${inspection.equipmentName}\nJenis: ${inspection.equipmentType}\nTemuan: ${inspection.findings}\nRekomendasi: ${inspection.recommendation || 'N/A'}`;
    const analysis = await analyzeInspectionData({ inspectionData }, userProfile);

    const currentDocSnap = await docRef.get();
    if (currentDocSnap.exists) {
        await docRef.update({ 
            aiStatus: 'completed', 
            aiSummary: analysis.summary 
        });
    }
  } catch (error) {
    console.error(`AI analysis failed for inspection ${inspection.id}:`, error);
    const currentDocSnap = await docRef.get();
    if (currentDocSnap.exists) {
        await docRef.update({ aiStatus: 'failed' });
    }
  }
}

/**
 * Triggers deeper, on-demand AI analysis for an inspection.
 * @param inspectionId The ID of the inspection to analyze.
 */
export async function runDeeperInspectionAnalysis(inspectionId: string): Promise<Inspection> {
    const docRef = adminDb.collection('inspections').doc(inspectionId);
    let docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Inspeksi tidak ditemukan.");
    const inspection = { id: docSnap.id, ...docSnap.data() } as Inspection;

    const userProfile = await getUserProfile(inspection.userId);
    if (!userProfile) throw new Error("Profil pengguna tidak ditemukan.");

    if (!userProfile.aiEnabled) {
        throw new Error("Fitur AI dinonaktifkan untuk pengguna ini.");
    }

    await docRef.update({ aiStatus: 'processing' });

    try {
        const inspectionData = `Nama Peralatan: ${inspection.equipmentName}\nJenis: ${inspection.equipmentType}\nTemuan: ${inspection.findings}\nRekomendasi: ${inspection.recommendation || 'N/A'}`;
        const deepAnalysis = await analyzeDeeperInspection({ inspectionData }, userProfile);
        
        docSnap = await docRef.get();
        if (!docSnap.exists) {
            console.log(`[runDeeperInspectionAnalysis] Inspection ${inspectionId} deleted during analysis. Aborting update.`);
            return inspection;
        }

        const updatePayload: Partial<Inspection> = {
            aiStatus: 'completed',
            aiSummary: deepAnalysis.summary,
            aiRisks: deepAnalysis.risks,
            aiSuggestedActions: deepAnalysis.suggestedActions,
        };

        await docRef.update(updatePayload);
        
        return { ...inspection, ...updatePayload, id: inspection.id };
    } catch (error) {
        console.error(`Deeper AI analysis failed for inspection ${inspectionId}:`, error);
        docSnap = await docRef.get();
        if (docSnap.exists) {
            await docRef.update({ aiStatus: 'failed' });
        }
        throw error;
    }
}

export async function retryAiAnalysis(item: Observation | Inspection): Promise<void> {
    // This function can now be simplified as it doesn't need to fetch the profile itself
    if (item.itemType === 'observation') {
      await triggerObservationAnalysis(item.id);
    } else if (item.itemType === 'inspection') {
      await triggerInspectionAnalysis(item.id);
    }
}
