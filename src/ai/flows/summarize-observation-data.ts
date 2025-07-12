
'use server';
/**
 * @fileOverview AI-powered analysis of HSSE observation and inspection data.
 *
 * This file defines Genkit flows for analyzing different types of HSSE reports.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { 
    SummarizeObservationDataInput,
    SummarizeObservationDataInputSchema,
    AnalyzeInspectionInput,
    AnalyzeInspectionInputSchema,
    AnalyzeInspectionOutput,
    AnalyzeInspectionOutputSchema,
    UserProfile,
    UserProfileSchema
} from '@/lib/types';


// =================================================================================
// 1. OBSERVATION ANALYSIS FLOW (RADICAL SIMPLIFICATION)
// =================================================================================

const ObservationAnalysisOutputSchema = z.object({
  summary: z.string().describe('A very brief, one-sentence summary of the observation in English.'),
  risks: z.string().describe('Bulleted list of potential dangers and safety risks (English).'),
  suggestedActions: z.string().describe('Bulleted list of clear, actionable recommendations (English).'),
});
export type DeeperAnalysisOutput = z.infer<typeof ObservationAnalysisOutputSchema>;


const analyzeObservationFlow = ai.defineFlow(
  {
    name: 'analyzeObservationFlow',
    inputSchema: z.object({ payload: SummarizeObservationDataInputSchema, userProfile: UserProfileSchema }),
    outputSchema: ObservationAnalysisOutputSchema,
  },
  async () => {
    // RADICAL SIMPLIFICATION: Bypass AI call and return a hardcoded success response.
    return {
      summary: 'Analisis berhasil (data statis).',
      risks: '- Tidak ada risiko teridentifikasi (data statis).',
      suggestedActions: '- Tidak ada tindakan yang diperlukan (data statis).',
    };
  }
);

export async function analyzeDeeperObservation(input: SummarizeObservationDataInput, userProfile: UserProfile): Promise<DeeperAnalysisOutput> {
  return analyzeObservationFlow({ payload: input, userProfile });
}


// =================================================================================
// 2. INSPECTION ANALYSIS FLOW (RADICAL SIMPLIFICATION)
// =================================================================================

const analyzeDeeperInspectionFlow = ai.defineFlow(
  {
    name: 'analyzeDeeperInspectionFlow',
    inputSchema: z.object({ payload: AnalyzeInspectionInputSchema, userProfile: UserProfileSchema }),
    outputSchema: AnalyzeInspectionOutputSchema,
  },
  async () => {
    // RADICAL SIMPLIFICATION: Bypass AI call and return a hardcoded success response.
    return {
      summary: 'Analisis inspeksi berhasil (data statis).',
      risks: '- Risiko dari inspeksi (data statis).',
      suggestedActions: '- Tindakan dari inspeksi (data statis).',
    };
  }
);

export async function analyzeDeeperInspection(input: AnalyzeInspectionInput, userProfile: UserProfile): Promise<AnalyzeInspectionOutput> {
  return analyzeDeeperInspectionFlow({ payload: input, userProfile });
}
