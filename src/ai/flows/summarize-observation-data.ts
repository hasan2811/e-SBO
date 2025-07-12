
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
// 1. OBSERVATION ANALYSIS FLOW
// =================================================================================

const ObservationAnalysisOutputSchema = z.object({
  summary: z.string().describe('A very brief, one-sentence summary of the observation in English.'),
  risks: z.string().describe('Bulleted list of potential dangers and safety risks (English).'),
  suggestedActions: z.string().describe('Bulleted list of clear, actionable recommendations (English).'),
});
export type DeeperAnalysisOutput = z.infer<typeof ObservationAnalysisOutputSchema>;


const observationAnalysisPrompt = ai.definePrompt({
    name: 'observationAnalysisPrompt',
    model: 'googleai/gemini-1.5-flash',
    input: { schema: SummarizeObservationDataInputSchema },
    output: { schema: ObservationAnalysisOutputSchema },
    config: {
        stream: false,
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
    },
    prompt: `You are a fast and efficient HSSE expert analyst. Your task is to perform a streamlined analysis of an observation report. Your response MUST be a raw JSON object only, in English.

Analyze the provided observation data and generate the following points:

1.  "summary": A very brief, one-sentence summary of the core finding.
2.  "risks": A bulleted list of the most critical potential dangers and safety risks. Start each point with a hyphen (-).
3.  "suggestedActions": A bulleted list of the most important, clear, and actionable recommendations. Start each point with a hyphen (-).

Observation Data to Analyze:
{{{observationData}}}
`,
});

const analyzeObservationFlow = ai.defineFlow(
  {
    name: 'analyzeObservationFlow',
    inputSchema: z.object({ payload: SummarizeObservationDataInputSchema, userProfile: UserProfileSchema }),
    outputSchema: ObservationAnalysisOutputSchema,
  },
  async ({ payload }) => {
    try {
        const { output } = await observationAnalysisPrompt(payload);
        if (!output) throw new Error('AI analysis returned no structured output.');
        
        return output;
    } catch (error: any) {
        console.error("Deeper Observation Analysis Error:", error);
        throw new Error('An unexpected error occurred during AI analysis.');
    }
  }
);

export async function analyzeDeeperObservation(input: SummarizeObservationDataInput, userProfile: UserProfile): Promise<DeeperAnalysisOutput> {
  return analyzeObservationFlow({ payload: input, userProfile });
}


// =================================================================================
// 2. INSPECTION ANALYSIS FLOW
// =================================================================================

const deeperAnalysisInspectionPrompt = ai.definePrompt({
    name: 'deeperAnalysisInspectionPrompt',
    model: 'googleai/gemini-1.5-flash',
    input: { schema: AnalyzeInspectionInputSchema },
    output: { schema: AnalyzeInspectionOutputSchema },
    config: {
        stream: false,
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
    },
    prompt: `You are an expert equipment inspector and safety analyst. Your task is to analyze the provided equipment inspection report data and provide clear, practical analysis points in English.
IMPORTANT: Your response must be a raw JSON object only, with no additional explanations or formatting.

Based on the provided inspection data, generate a JSON object with the following format. All responses must be in English.

1.  "summary": Provide a very brief summary (one or two sentences) of the core inspection findings.
2.  "risks": Explain the potential hazards and safety risks arising from the reported equipment condition. Present this as **brief bullet points starting with a hyphen (-)**.
3.  "suggestedActions": Provide clear, executable suggestions for repair or mitigation. Present this as **brief bullet points starting with a hyphen (-)**.

Inspection Data:
{{{inspectionData}}}`,
});

const analyzeDeeperInspectionFlow = ai.defineFlow(
  {
    name: 'analyzeDeeperInspectionFlow',
    inputSchema: z.object({ payload: AnalyzeInspectionInputSchema, userProfile: UserProfileSchema }),
    outputSchema: AnalyzeInspectionOutputSchema,
  },
  async ({ payload }) => {
    try {
        const { output } = await deeperAnalysisInspectionPrompt(payload);
        if (!output) throw new Error('AI deep inspection analysis returned no structured output.');
        return output;
    } catch (error: any) {
        console.error("Deeper Inspection Analysis Error:", error);
        throw new Error('An unexpected error occurred during AI analysis.');
    }
  }
);

export async function analyzeDeeperInspection(input: AnalyzeInspectionInput, userProfile: UserProfile): Promise<AnalyzeInspectionOutput> {
  return analyzeDeeperInspectionFlow({ payload: input, userProfile });
}
