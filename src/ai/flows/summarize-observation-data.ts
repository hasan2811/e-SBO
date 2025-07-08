
'use server';
/**
 * @fileOverview AI-powered analysis of HSSE observation and inspection data.
 *
 * This file defines Genkit flows for analyzing different types of HSSE reports.
 * It uses a two-phase approach for observations for better perceived performance.
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


/**
 * Parses a rating value which might be a string or number, and ensures it's within the 1-5 range.
 * @param value The value to parse.
 * @returns A number between 1 and 5.
 */
function parseAndClampRating(value: string | number | undefined): number {
    if (value === undefined || value === null) return 3;
    let numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
    if (isNaN(numericValue)) return 3;
    return Math.max(1, Math.min(5, Math.round(numericValue)));
}

// =================================================================================
// 1. DEEPER OBSERVATION ANALYSIS FLOW (ON-DEMAND)
// =================================================================================

const DeeperAnalysisOutputSchema = z.object({
  summary: z.string().describe('A very brief, one-sentence summary of the observation in English.'),
  aiObserverSkillRating: z.number().min(1).max(5).describe('Rating of the observer skill from 1 to 5 based on the quality of the report.'),
  aiObserverSkillExplanation: z.string().describe('A brief explanation for the observer skill rating in English.'),
  risks: z.string().describe('Bulleted list of potential dangers and safety risks (English).'),
  suggestedActions: z.string().describe('Bulleted list of clear, actionable recommendations (English).'),
  rootCauseAnalysis: z.string().describe('Brief, one-sentence analysis of the most likely root cause (English).'),
  relevantRegulations: z.string().describe('Bulleted list of *types* of applicable safety standards (English).'),
});
export type DeeperAnalysisOutput = z.infer<typeof DeeperAnalysisOutputSchema>;


const deeperAnalysisPrompt = ai.definePrompt({
    name: 'deeperAnalysisPrompt',
    model: 'googleai/gemini-1.5-flash-latest',
    input: { schema: SummarizeObservationDataInputSchema },
    output: { schema: DeeperAnalysisOutputSchema },
    config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
    },
    prompt: `You are a world-class HSSE expert analyst. Your task is to perform a detailed analysis of an observation report. Provide a concise but thorough analysis. Your response MUST be a raw JSON object only, in English.

Analyze the provided observation data and generate the following points:

1.  "summary": A very brief, one-sentence summary of the core finding.
2.  "aiObserverSkillRating": A 1-5 rating of the observer's skill based on clarity and impact.
3.  "aiObserverSkillExplanation": A brief, one-sentence explanation for the skill rating.
4.  "risks": A bulleted list of potential dangers and safety risks. Start each point with a hyphen (-).
5.  "suggestedActions": A bulleted list of clear, actionable recommendations. Start each point with a hyphen (-).
6.  "rootCauseAnalysis": A brief, one-sentence analysis of the most likely root cause (e.g., procedure, training, equipment).
7.  "relevantRegulations": A bulleted list of **types** of safety standards that apply (e.g., "Working at Height Standards", "Lifting Procedures"). **Do not cite specific codes.**

Observation Data to Analyze:
{{{observationData}}}
`,
});

const analyzeDeeperObservationFlow = ai.defineFlow(
  {
    name: 'analyzeDeeperObservationFlow',
    inputSchema: z.object({ payload: SummarizeObservationDataInputSchema, userProfile: UserProfileSchema }),
    outputSchema: DeeperAnalysisOutputSchema,
  },
  async ({ payload, userProfile }) => {
    const response = await deeperAnalysisPrompt(payload);
    const output = response.output;
    if (!output) throw new Error('AI deep analysis returned no structured output.');

    return {
      ...output,
      aiObserverSkillRating: parseAndClampRating(output.aiObserverSkillRating),
    };
  }
);

// This function is called for deeper, on-demand analysis from the UI OR as a background task.
export async function analyzeDeeperObservation(input: SummarizeObservationDataInput, userProfile: UserProfile): Promise<DeeperAnalysisOutput> {
  return analyzeDeeperObservationFlow({ payload: input, userProfile });
}


// =================================================================================
// 2. DEEP INSPECTION ANALYSIS FLOW (ON-DEMAND)
// =================================================================================

const deeperAnalysisInspectionPrompt = ai.definePrompt({
    name: 'deeperAnalysisInspectionPrompt',
    model: 'googleai/gemini-1.5-flash-latest',
    input: { schema: AnalyzeInspectionInputSchema },
    output: { schema: AnalyzeInspectionOutputSchema }, // Re-uses the full output schema
    config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
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
  async ({ payload, userProfile }) => {
    const response = await deeperAnalysisInspectionPrompt(payload);
    if (!response.output) throw new Error('AI deep inspection analysis returned no structured output.');
    return response.output;
  }
);

export async function analyzeDeeperInspection(input: AnalyzeInspectionInput, userProfile: UserProfile): Promise<AnalyzeInspectionOutput> {
  return analyzeDeeperInspectionFlow({ payload: input, userProfile });
}
