
'use server';
/**
 * @fileOverview AI-powered analysis of HSSE observation and inspection data.
 *
 * This file defines Genkit flows for analyzing different types of HSSE reports.
 * It uses a two-phase approach for observations for better perceived performance.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';
import { 
    RISK_LEVELS,
    OBSERVATION_CATEGORIES,
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
 * Finds the best match for a given value from a list of options, or returns a default.
 * It's case-insensitive and checks for partial matches.
 * @param value The string value to match.
 * @param options The list of valid options.
 * @param defaultValue The default value to return if no match is found.
 * @returns The best matching option or the default value.
 */
function findClosestMatch<T extends string>(value: string | undefined, options: readonly T[], defaultValue: T): T {
    if (!value) return defaultValue;
    const lowerValue = value.toLowerCase().trim();
    const exactMatch = options.find(opt => opt.toLowerCase() === lowerValue);
    if (exactMatch) return exactMatch;
    const partialMatch = options.find(opt => lowerValue.includes(opt.toLowerCase()));
    if (partialMatch) return partialMatch;
    const fuzzyMatch = options.find(opt => opt.toLowerCase().includes(lowerValue));
    if (fuzzyMatch) return fuzzyMatch;
    return defaultValue;
}

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
// 1. FAST OBSERVATION CLASSIFICATION FLOW (Category & Risk)
// =================================================================================

const FastClassificationOutputSchema = z.object({
  suggestedCategory: z.enum(OBSERVATION_CATEGORIES),
  suggestedRiskLevel: z.enum(RISK_LEVELS),
});
export type FastClassificationOutput = z.infer<typeof FastClassificationOutputSchema>;


const fastClassificationPrompt = ai.definePrompt({
    name: 'fastClassificationPrompt',
    model: 'googleai/gemini-1.5-flash-latest',
    input: { schema: SummarizeObservationDataInputSchema },
    output: { schema: FastClassificationOutputSchema },
    config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
    },
    prompt: `You are an ultra-fast HSSE AI. Your ONLY job is to classify the following report. Provide ONLY the most likely 'suggestedCategory' and 'suggestedRiskLevel'. Your response MUST be a raw JSON object and nothing else.

Category Options: ${OBSERVATION_CATEGORIES.join(', ')}
Risk Level Options: ${RISK_LEVELS.join(', ')}

Report:
{{{observationData}}}
`,
});

const fastClassificationFlow = ai.defineFlow(
  {
    name: 'fastClassificationFlow',
    inputSchema: z.object({ payload: SummarizeObservationDataInputSchema, userProfile: UserProfileSchema }),
    outputSchema: FastClassificationOutputSchema,
  },
  async ({ payload, userProfile }) => {
    const model = userProfile.googleAiApiKey 
        ? googleAI({ apiKey: userProfile.googleAiApiKey }).model('gemini-1.5-flash-latest')
        : 'googleai/gemini-1.5-flash-latest';
    
    const response = await fastClassificationPrompt(payload, { model });
    const output = response.output;
    if (!output) throw new Error('Fast AI classification returned no structured output.');
    
    return {
      suggestedCategory: findClosestMatch(output.suggestedCategory, OBSERVATION_CATEGORIES, 'Supervision'),
      suggestedRiskLevel: findClosestMatch(output.suggestedRiskLevel, RISK_LEVELS, 'Low'),
    };
  }
);

// This is the main exported function for the initial, fast analysis.
export async function runFastClassification(input: SummarizeObservationDataInput, userProfile: UserProfile): Promise<FastClassificationOutput> {
  return fastClassificationFlow({ payload: input, userProfile });
}


// =================================================================================
// 2. BACKGROUND/DEEPER OBSERVATION ANALYSIS FLOW
// =================================================================================

const DeeperAnalysisOutputSchema = z.object({
  summary: z.string().describe('A very brief, one-sentence summary of the observation in Bahasa Indonesia.'),
  aiObserverSkillRating: z.number().min(1).max(5).describe('Rating of the observer skill from 1 to 5 based on the quality of the report.'),
  aiObserverSkillExplanation: z.string().describe('A brief explanation for the observer skill rating in Bahasa Indonesia.'),
  risks: z.string().describe('Bulleted list of potential dangers and safety risks (Bahasa Indonesia).'),
  suggestedActions: z.string().describe('Bulleted list of clear, actionable recommendations (Bahasa Indonesia).'),
  rootCauseAnalysis: z.string().describe('Brief, one-sentence analysis of the most likely root cause (Bahasa Indonesia).'),
  relevantRegulations: z.string().describe('Bulleted list of *types* of applicable safety standards (Bahasa Indonesia).'),
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
    prompt: `You are a world-class HSSE expert analyst. Your task is to perform a detailed analysis of an observation report. Provide a concise but thorough analysis. Your response MUST be a raw JSON object only, in Bahasa Indonesia.

Analyze the provided observation data and generate the following points:

1.  "summary": A very brief, one-sentence summary of the core finding.
2.  "aiObserverSkillRating": A 1-5 rating of the observer's skill based on clarity and impact.
3.  "aiObserverSkillExplanation": A brief, one-sentence explanation for the skill rating.
4.  "risks": A bulleted list of potential dangers and safety risks. Start each point with a hyphen (-).
5.  "suggestedActions": A bulleted list of clear, actionable recommendations. Start each point with a hyphen (-).
6.  "rootCauseAnalysis": A brief, one-sentence analysis of the most likely root cause (e.g., procedure, training, equipment).
7.  "relevantRegulations": A bulleted list of **types** of safety standards that apply (e.g., "Standar Bekerja di Ketinggian", "Prosedur Pengangkatan"). **Do not cite specific codes.**

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
    const model = userProfile.googleAiApiKey
        ? googleAI({ apiKey: userProfile.googleAiApiKey }).model('gemini-1.5-flash-latest')
        : 'googleai/gemini-1.5-flash-latest';
    
    const response = await deeperAnalysisPrompt(payload, { model });
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
// 3. FAST INSPECTION ANALYSIS FLOW
// =================================================================================

const FastSummarizeInspectionOutputSchema = z.object({
  summary: z.string().describe('Ringkasan yang sangat singkat (satu atau dua kalimat) dari temuan inti inspeksi.'),
});

const summarizeInspectionPrompt = ai.definePrompt({
    name: 'summarizeInspectionPrompt',
    model: 'googleai/gemini-1.5-flash-latest',
    input: { schema: AnalyzeInspectionInputSchema },
    output: { schema: FastSummarizeInspectionOutputSchema },
    config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
    },
    prompt: `Anda adalah seorang ahli inspeksi yang sangat cepat. Tugas Anda HANYA menganalisis data laporan inspeksi dan memberikan ringkasan satu kalimat dalam Bahasa Indonesia.
PENTING: Respons Anda harus berupa objek JSON mentah saja dengan satu kunci: "summary".

Contoh Respons:
{
  "summary": "Ditemukan kerusakan pada kabel hidrolik ekskavator yang berpotensi menyebabkan kegagalan fungsi."
}

Data Inspeksi untuk dianalisis:
{{{inspectionData}}}`,
});

const analyzeInspectionDataFlow = ai.defineFlow(
  {
    name: 'analyzeInspectionDataFlow',
    inputSchema: z.object({ payload: AnalyzeInspectionInputSchema, userProfile: UserProfileSchema }),
    outputSchema: z.object({ summary: z.string() }),
  },
  async ({ payload, userProfile }) => {
    const model = userProfile.googleAiApiKey
        ? googleAI({ apiKey: userProfile.googleAiApiKey }).model('gemini-1.5-flash-latest')
        : 'googleai/gemini-1.5-flash-latest';
    const response = await summarizeInspectionPrompt(payload, { model });
    if (!response.output) throw new Error('AI analysis returned no structured output for inspection.');
    return { summary: response.output.summary };
  }
);

export async function analyzeInspectionData(input: AnalyzeInspectionInput, userProfile: UserProfile): Promise<{ summary: string }> {
  return analyzeInspectionDataFlow({ payload: input, userProfile });
}


// =================================================================================
// 4. DEEP INSPECTION ANALYSIS FLOW (ON-DEMAND)
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
    prompt: `Anda adalah seorang ahli inspeksi peralatan dan analis keselamatan. Tugas Anda adalah menganalisis data laporan inspeksi peralatan dan memberikan poin-poin analisis yang jelas dan praktis dalam Bahasa Indonesia.
PENTING: Respons Anda harus berupa objek JSON mentah saja, tanpa penjelasan atau pemformatan tambahan.

Berdasarkan data inspeksi yang diberikan, hasilkan objek JSON dengan format berikut. Semua respons harus dalam Bahasa Indonesia.

1.  "summary": Berikan ringkasan yang sangat singkat (satu atau dua kalimat) dari temuan inti inspeksi.
2.  "risks": Jelaskan potensi bahaya dan risiko keselamatan yang timbul dari kondisi peralatan yang dilaporkan. Sajikan dalam bentuk **poin-poin singkat yang diawali dengan tanda hubung (-)**.
3.  "suggestedActions": Berikan saran tindakan yang jelas dan dapat dieksekusi untuk perbaikan atau mitigasi. Sajikan dalam bentuk **poin-poin singkat yang diawali dengan tanda hubung (-)**.

Data Inspeksi:
{{{inspectionData}}}`,
});

const analyzeDeeperInspectionFlow = ai.defineFlow(
  {
    name: 'analyzeDeeperInspectionFlow',
    inputSchema: z.object({ payload: AnalyzeInspectionInputSchema, userProfile: UserProfileSchema }),
    outputSchema: AnalyzeInspectionOutputSchema,
  },
  async ({ payload, userProfile }) => {
    const model = userProfile.googleAiApiKey
        ? googleAI({ apiKey: userProfile.googleAiApiKey }).model('gemini-1.5-flash-latest')
        : 'googleai/gemini-1.5-flash-latest';
    const response = await deeperAnalysisInspectionPrompt(payload, { model });
    if (!response.output) throw new Error('AI deep inspection analysis returned no structured output.');
    return response.output;
  }
);

export async function analyzeDeeperInspection(input: AnalyzeInspectionInput, userProfile: UserProfile): Promise<AnalyzeInspectionOutput> {
  return analyzeDeeperInspectionFlow({ payload: input, userProfile });
}
