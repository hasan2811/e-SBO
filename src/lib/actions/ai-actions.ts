
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { Observation, Inspection, UserProfile } from '@/lib/types';
import { 
    analyzeDeeperObservation, 
    analyzeDeeperInspection,
} from '@/ai/flows/summarize-observation-data';

/**
 * Truncates text to a specified maximum length without cutting words.
 * Returns an empty string if the input text is falsy.
 * @param text The text to truncate.
 * @param maxLength The maximum length of the truncated text.
 * @returns The truncated text or an empty string.
 */
function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) {
    return '';
  }
  if (text.length <= maxLength) {
    return text;
  }
  // Find the last space within the maxLength to avoid cutting words
  const lastSpace = text.substring(0, maxLength).lastIndexOf(' ');
  const cutOff = lastSpace > 0 ? lastSpace : maxLength;
  return text.substring(0, cutOff) + '...';
}

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
 * Triggers deeper, on-demand AI analysis for an observation.
 * @param observationId The ID of the observation to analyze.
 */
export async function runDeeperAnalysis(observationId: string): Promise<Observation> {
    // ## Validation Guard ##
    console.log('[DEBUG_FIRESTORE] Attempting analysis for Observation ID:', observationId);
    if (typeof observationId !== 'string' || !observationId.trim()) {
        console.error('[DEBUG_FIRESTORE ERROR] Invalid Observation ID received:', observationId);
        throw new Error('Invalid or missing observationId provided.');
    }
    
    const docRef = adminDb.collection('observations').doc(observationId);
    let docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Observation not found.");
    const observation = { id: docSnap.id, ...docSnap.data() } as Observation;

    const userProfile = await getUserProfile(observation.userId);
    if (!userProfile) throw new Error("User profile not found.");

    if (!userProfile.aiEnabled) {
      throw new Error("AI features are disabled for this user.");
    }
    
    // Validate that there is content to analyze
    if (!observation.findings || observation.findings.trim() === '') {
        await docRef.update({ aiStatus: 'failed' });
        throw new Error("Cannot run analysis: The observation's 'findings' field is empty.");
    }

    await docRef.update({ aiStatus: 'processing' });

    try {
        const findingsText = truncateText(observation.findings, 500);
        const recommendationText = truncateText(observation.recommendation, 250);

        let observationData = `Category: ${observation.category}; Risk Level: ${observation.riskLevel}; Status: ${observation.status}; Location: ${observation.location}; Findings: ${findingsText}`;
        
        if (recommendationText) {
            observationData += `; Recommendation: ${recommendationText}`;
        }
        
        console.log(`[DEBUG_OBS_PROMPT]: ${observationData}`);
        
        // This is the simplified prompt call
        const analysis = await analyzeDeeperObservation({ observationData }, userProfile);

        console.log(`[DEBUG_OBS_RAW_RESPONSE]: ${JSON.stringify(analysis)}`);
        
        docSnap = await docRef.get();
        if (!docSnap.exists) {
          console.log(`[runDeeperAnalysis] Observation ${observationId} deleted during analysis. Aborting update.`);
          return observation; 
        }
        
        const updatePayload: Partial<Observation> = {
            aiStatus: 'completed',
            aiSummary: analysis.summary,
            aiRisks: analysis.risks,
            aiSuggestedActions: analysis.suggestedActions,
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
 * Triggers deeper, on-demand AI analysis for an inspection.
 * @param inspectionId The ID of the inspection to analyze.
 */
export async function runDeeperInspectionAnalysis(inspectionId: string): Promise<Inspection> {
    // ## Validation Guard ##
    console.log('[DEBUG_FIRESTORE] Attempting analysis for Inspection ID:', inspectionId);
    if (typeof inspectionId !== 'string' || !inspectionId.trim()) {
      console.error('[DEBUG_FIRESTORE ERROR] Invalid Inspection ID received:', inspectionId);
      throw new Error('Invalid or missing inspectionId provided.');
    }

    const docRef = adminDb.collection('inspections').doc(inspectionId);
    let docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Inspection not found.");
    const inspection = { id: docSnap.id, ...docSnap.data() } as Inspection;

    const userProfile = await getUserProfile(inspection.userId);
    if (!userProfile) throw new Error("User profile not found.");

    if (!userProfile.aiEnabled) {
        throw new Error("AI features are disabled for this user.");
    }

    if (!inspection.findings || inspection.findings.trim() === '') {
        await docRef.update({ aiStatus: 'failed' });
        throw new Error("Cannot run analysis: The inspection's 'findings' field is empty.");
    }

    await docRef.update({ aiStatus: 'processing' });

    try {
        const findingsText = truncateText(inspection.findings, 500);
        const recommendationText = truncateText(inspection.recommendation, 250);

        let inspectionData = `Equipment: ${inspection.equipmentName} (${inspection.equipmentType}); Status: ${inspection.status}; Location: ${inspection.location}; Findings: ${findingsText}`;

        if (recommendationText) {
            inspectionData += `; Recommendation: ${recommendationText}`;
        }
        
        console.log(`[runDeeperInspectionAnalysis] Sending prompt for inspection ${inspectionId}:`, inspectionData);

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
