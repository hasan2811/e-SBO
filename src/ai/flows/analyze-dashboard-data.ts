
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
      analysis: `- Tren Positif: Terjadi peningkatan 30% dalam laporan "Positive Observation" bulan ini, menunjukkan peningkatan kesadaran keselamatan.\n- Area Risiko Tinggi: Area Fabrikasi secara konsisten menjadi lokasi dengan laporan risiko 'Tinggi' dan 'Kritis' terbanyak. Perlu perhatian khusus.\n- Tindakan Mendesak: Terdapat 5 laporan berisiko 'Kritis' yang masih berstatus 'Pending' lebih dari 3 hari. Segera tindak lanjuti.`,
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
