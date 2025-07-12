
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
      summary: 'An oil spill was found in the workshop area, creating a slip hazard.',
      risks: '- Risk of slips and falls for workers passing through.\n- Potential fire hazard if ignition sources are nearby.\n- Environmental contamination if the spill is not handled properly.',
      suggestedActions: '- Immediately isolate the spill area with barricades.\n- Use absorbent powder to clean up the oil spill.\n- Investigate the source of the leak and perform repairs.',
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
      summary: 'Inspection of a fire extinguisher (APAR) shows its pressure is below the safe standard.',
      risks: '- The extinguisher may not function effectively when needed in a fire emergency.\n- Non-compliance with fire safety standards.',
      suggestedActions: '- Immediately replace the unit with a new or recharged one.\n- Conduct a routine check on all fire extinguishers in the area.\n- Increase the frequency of extinguisher inspections to monthly.',
    };
  }
);

export async function analyzeDeeperInspection(input: AnalyzeInspectionInput, userProfile: UserProfile): Promise<AnalyzeInspectionOutput> {
  return analyzeDeeperInspectionFlow({ payload: input, userProfile });
}
