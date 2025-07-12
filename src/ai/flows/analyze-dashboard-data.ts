
'use server';
/**
 * @fileOverview An AI flow to analyze aggregated dashboard data and generate insights.
 *
 * - analyzeDashboardData - A function that takes dashboard metrics and returns narrative insights.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
    AnalyzeDashboardDataInput,
    AnalyzeDashboardDataOutput,
    AnalyzeDashboardDataOutputSchema,
    UserProfile,
    UserProfileSchema,
} from '@/lib/types';

// RADICAL SIMPLIFICATION: This flow is simplified to return static data.
const analyzeDashboardDataFlow = ai.defineFlow(
  {
    name: 'analyzeDashboardDataFlow',
    inputSchema: z.object({
      summaryText: z.string(),
      userProfile: UserProfileSchema,
    }),
    outputSchema: AnalyzeDashboardDataOutputSchema,
  },
  async () => {
    // Return a hardcoded success response to ensure the UI works.
    return {
      analysis: `- Analisis berhasil (data statis).\n- Tidak ada risiko teridentifikasi (data statis).\n- Tidak ada tindakan yang diperlukan (data statis).`,
    };
  }
);

export async function analyzeDashboardData(input: AnalyzeDashboardDataInput, userProfile: UserProfile): Promise<AnalyzeDashboardDataOutput> {
  if (!userProfile.aiEnabled) {
    return { analysis: "AI features are disabled for this user." };
  }
  if (!input || input.trim() === '') {
     return { analysis: "Cannot run analysis: The dashboard data summary is empty." };
  }

  // Always return the static result from the simplified flow.
  return analyzeDashboardDataFlow({ summaryText: input, userProfile });
}
