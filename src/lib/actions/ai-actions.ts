
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { Observation, Inspection, UserProfile } from '@/lib/types';
import { 
    analyzeDeeperObservation, 
    analyzeDeeperInspection,
} from '@/ai/flows/summarize-observation-data';

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
    const docRef = adminDb.collection('observations').doc(observationId);
    let docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Observation not found.");
    const observation = { id: docSnap.id, ...docSnap.data() } as Observation;

    const userProfile = await getUserProfile(observation.userId);
    if (!userProfile) throw new Error("User profile not found.");

    if (!userProfile.aiEnabled) {
      throw new Error("AI features are disabled for this user.");
    }

    await docRef.update({ aiStatus: 'processing' });

    try {
        const observationData = `Findings: ${observation.findings}\nRecommendation: ${observation.recommendation}\nInitial Category: ${observation.category}`;
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
 * Triggers deeper, on-demand AI analysis for an inspection.
 * @param inspectionId The ID of the inspection to analyze.
 */
export async function runDeeperInspectionAnalysis(inspectionId: string): Promise<Inspection> {
    const docRef = adminDb.collection('inspections').doc(inspectionId);
    let docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Inspection not found.");
    const inspection = { id: docSnap.id, ...docSnap.data() } as Inspection;

    const userProfile = await getUserProfile(inspection.userId);
    if (!userProfile) throw new Error("User profile not found.");

    if (!userProfile.aiEnabled) {
        throw new Error("AI features are disabled for this user.");
    }

    await docRef.update({ aiStatus: 'processing' });

    try {
        const inspectionData = `Equipment Name: ${inspection.equipmentName}\nType: ${inspection.equipmentType}\nFindings: ${inspection.findings}\nRecommendation: ${inspection.recommendation || 'N/A'}`;
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
