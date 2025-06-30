'use server';

import { assistObservation, AssistObservationInput, AssistObservationOutput } from '@/ai/flows/assist-observation-flow';

/**
 * Server action to get real-time AI assistance for an observation form.
 * @param input - The user's current findings.
 * @returns An object with AI suggestions for category, risk level, and recommendations.
 */
export async function getAIAssistance(input: AssistObservationInput): Promise<AssistObservationOutput> {
  try {
    const result = await assistObservation(input);
    return result;
  } catch (error) {
    console.error("Error getting AI assistance:", error);
    // You might want to throw a more user-friendly error
    throw new Error("Failed to get AI assistance. Please try again.");
  }
}
