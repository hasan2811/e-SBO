
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { Observation, Inspection, UserProfile } from '@/lib/types';
import { 
    analyzeDeeperObservation, 
    analyzeDeeperInspection, 
    analyzeInspectionData 
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
 * Triggers the AI analysis for a new observation.
 * This function is fire-and-forget. It updates the document in the background.
 * It respects the user's AI-enabled setting.
 * @param observationId The ID of the newly created observation document.
 * @param userProfile The profile of the user who submitted the observation.
 */
export async function triggerObservationAnalysis(observationId: string, userProfile: UserProfile) {
  const docRef = adminDb.collection('observations').doc(observationId);

  // Fetch the authoritative data from the server
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    console.error(`[triggerObservationAnalysis] Observation with ID ${observationId} not found.`);
    return;
  }
  const observation = { id: docSnap.id, ...docSnap.data() } as Observation;
  
  // Immediately trigger smart notify if it's a project observation and AI is enabled
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

  // If AI is disabled, mark as n/a and stop here.
  if (!userProfile.aiEnabled) {
      await docRef.update({ aiStatus: 'n/a' });
      return;
  }
  
  await docRef.update({ aiStatus: 'processing' });

  // Now, run the deeper analysis in the background
  try {
    const observationData = `Temuan: ${observation.findings}\nRekomendasi: ${observation.recommendation}\nKategori Awal: ${observation.category}\nTingkat Risiko: ${observation.riskLevel}`;
    const deepAnalysis = await analyzeDeeperObservation({ observationData }, userProfile);
    
    // Check if the document still exists before updating
    const currentDocSnap = await docRef.get();
    if (currentDocSnap.exists) {
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
    }
  } catch (error) {
    console.error(`Deeper analysis failed for obs ${observation.id}:`, error);
    const currentDocSnap = await docRef.get();
    if (currentDocSnap.exists) {
        await docRef.update({ aiStatus: 'failed' });
    }
  }
}

/**
 * Triggers deeper, on-demand AI analysis for an observation.
 * Returns the fully updated observation object.
 * @param observationId The ID of the observation to analyze.
 * @param userProfile The profile of the user requesting the analysis.
 */
export async function runDeeperAnalysis(observationId: string, userProfile: UserProfile): Promise<Observation> {
    const docRef = adminDb.collection('observations').doc(observationId);
    let docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Observasi tidak ditemukan.");
    const observation = { id: docSnap.id, ...docSnap.data() } as Observation;

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
 * @param userProfile The profile of the user who submitted the inspection.
 */
export async function triggerInspectionAnalysis(inspectionId: string, userProfile: UserProfile) {
  const docRef = adminDb.collection('inspections').doc(inspectionId);

  if (!userProfile.aiEnabled) {
    await docRef.update({ aiStatus: 'n/a' });
    return;
  }
  
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    console.error(`[triggerInspectionAnalysis] Inspection with ID ${inspectionId} not found.`);
    return;
  }
  const inspection = { id: docSnap.id, ...docSnap.data() } as Inspection;

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
 * @param userProfile The profile of the user requesting the analysis.
 */
export async function runDeeperInspectionAnalysis(inspectionId: string, userProfile: UserProfile): Promise<Inspection> {
    const docRef = adminDb.collection('inspections').doc(inspectionId);
    let docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Inspeksi tidak ditemukan.");
    const inspection = { id: docSnap.id, ...docSnap.data() } as Inspection;

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
    const userProfile = await getUserProfile(item.userId);
    if (!userProfile || !userProfile.aiEnabled) {
        throw new Error("AI is disabled for the user.");
    }
    
    if (item.itemType === 'observation') {
      await triggerObservationAnalysis(item.id, userProfile);
    } else if (item.itemType === 'inspection') {
      await triggerInspectionAnalysis(item.id, userProfile);
    }
}
