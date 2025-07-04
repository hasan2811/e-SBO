'use server';

import { assistObservation, AssistObservationInput, AssistObservationOutput } from '@/ai/flows/assist-observation-flow';

/**
 * Server action to get real-time AI assistance for an observation form.
 * @param input - The user's current findings.
 * @returns An object with AI suggestions for category, risk level, and recommendations.
 */
export async function getAIAssistance(input: AssistObservationInput): Promise<AssistObservationOutput> {
  try {
    // This flow is designed to be fast and lightweight for real-time use.
    const result = await assistObservation(input);
    return result;
  } catch (error) {
    console.error("Error getting AI assistance:", error);
    // Propagate the error to be handled by the client-side caller.
    throw new Error("Failed to get AI assistance. The AI model may be temporarily unavailable.");
  }
}
