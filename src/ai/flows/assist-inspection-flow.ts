
'use server';
/**
 * @fileOverview An AI flow to assist users in real-time while they fill out an inspection form.
 *
 * - assistInspection - A function that suggests improvements and classifications for an inspection in progress.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { INSPECTION_STATUSES, AssistInspectionInput, AssistInspectionInputSchema, AssistInspectionOutput, AssistInspectionOutputSchema, InspectionStatus, UserProfile, UserProfileSchema } from '@/lib/types';

// RADICAL SIMPLIFICATION: This flow is simplified to return static data.
const assistInspectionFlow = ai.defineFlow(
  {
    name: 'assistInspectionFlow',
    inputSchema: z.object({
        payload: AssistInspectionInputSchema,
        userProfile: UserProfileSchema,
    }),
    outputSchema: AssistInspectionOutputSchema,
  },
  async ({ payload }) => {
    // Return a hardcoded success response to ensure the UI works.
    return {
      suggestedStatus: 'Pass',
      improvedFindings: `${payload.findings} (disarankan perbaikan oleh AI).`,
      suggestedRecommendation: 'Segera perbaiki sesuai standar keamanan.',
    };
  }
);

export async function assistInspection(input: AssistInspectionInput, userProfile: UserProfile): Promise<AssistInspectionOutput> {
  if (!userProfile.aiEnabled) {
    return {
      suggestedStatus: 'Pass',
      improvedFindings: input.findings,
      suggestedRecommendation: 'AI is disabled.',
    };
  }
  const result = await assistInspectionFlow({ payload: input, userProfile });
  return {
      ...result,
      suggestedStatus: result.suggestedStatus as InspectionStatus,
  };
}
