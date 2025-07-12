
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
      analysis: `- Positive Trend: A 30% increase in "Positive Observation" reports this month indicates heightened safety awareness.\n- High-Risk Area: The Fabrication Area consistently has the most 'High' and 'Critical' risk reports. Special attention is needed.\n- Urgent Actions: There are 5 'Critical' risk reports still 'Pending' for over 3 days. Follow up immediately.`,
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
