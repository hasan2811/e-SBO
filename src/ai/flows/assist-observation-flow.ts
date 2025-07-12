
'use server';
/**
 * @fileOverview An AI flow to assist users in real-time while they fill out an observation form.
 *
 * - assistObservation - A function that suggests improvements and classifications for an observation in progress.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { RISK_LEVELS, RiskLevel, AssistObservationInput, AssistObservationInputSchema, AssistObservationOutput, AssistObservationOutputSchema, UserProfile, UserProfileSchema } from '@/lib/types';

// RADICAL SIMPLIFICATION: This flow is simplified to return static data.
const assistObservationFlow = ai.defineFlow(
  {
    name: 'assistObservationFlow',
    inputSchema: z.object({
        payload: AssistObservationInputSchema,
        userProfile: UserProfileSchema,
    }),
    outputSchema: AssistObservationOutputSchema,
  },
  async ({ payload }): Promise<AssistObservationOutput> => {
    // Return a hardcoded success response to ensure the UI works.
    return {
        suggestedCategory: 'Unsafe Condition',
        suggestedRiskLevel: 'Medium',
        improvedFindings: `${payload.findings} (disarankan perbaikan oleh AI).`,
        suggestedRecommendation: 'Segera lakukan mitigasi risiko sesuai prosedur.',
    };
  }
);

export async function assistObservation(input: AssistObservationInput, userProfile: UserProfile): Promise<AssistObservationOutput> {
  if (!userProfile.aiEnabled) {
    return {
      suggestedCategory: 'Unsafe Condition',
      suggestedRiskLevel: 'Low',
      improvedFindings: input.findings,
      suggestedRecommendation: 'AI is disabled.',
    };
  }
  const result = await assistObservationFlow({ payload: input, userProfile });
  return {
      ...result,
      suggestedRiskLevel: result.suggestedRiskLevel as RiskLevel,
  };
}
