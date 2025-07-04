
'use server';
/**
 * @fileOverview AI-powered analysis of HSSE observation and inspection data.
 *
 * This file defines Genkit flows for analyzing different types of HSSE reports.
 * - summarizeObservationData: A fast, initial analysis of a standard observation report.
 * - analyzeDeeperObservation: A slower, more detailed analysis of an observation.
 * - analyzeInspectionData: A fast, initial analysis of an equipment inspection report.
 * - analyzeDeeperInspection: A slower, more detailed analysis of an inspection.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';
import { 
    RISK_LEVELS,
    OBSERVATION_CATEGORIES,
    SummarizeObservationDataInput,
    SummarizeObservationDataInputSchema,
    SummarizeObservationDataOutput,
    SummarizeObservationDataOutputSchema,
    DeeperAnalysisOutput,
    DeeperAnalysisOutputSchema,
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
    if (value === undefined || value === null) return 3; // Default to a neutral rating

    let numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
    
    if (isNaN(numericValue)) return 3;

    return Math.max(1, Math.min(5, Math.round(numericValue))); // Clamp between 1 and 5
}


// =================================================================================
// 1. FAST OBSERVATION ANALYSIS FLOW
// =================================================================================

// This schema is for the prompt's output, requesting only the fastest analysis points.
const FastSummarizeOutputSchema = z.object({
  suggestedCategory: z.enum(OBSERVATION_CATEGORIES).describe('Saran kategori berdasarkan analisis temuan.'),
  aiObserverSkillRating: z.number().min(1).max(5).describe('Rating of the observer skill from 1 to 5 based on how impactful and clear the report is.'),
  aiObserverSkillExplanation: z.string().describe('A brief, one-sentence explanation for the observer skill rating.'),
});

const summarizeObservationPrompt = ai.definePrompt({
    name: 'summarizeObservationPrompt',
    model: 'googleai/gemini-1.5-flash-latest',
    input: { schema: SummarizeObservationDataInputSchema },
    output: { schema: FastSummarizeOutputSchema },
    config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
    },
    prompt: `You are an ultra-fast HSSE (Health, Safety, Security, Environment) AI Analyst.
Your ONLY job is to analyze the following observation report and provide a rating, a category, and a very short explanation.
Your response MUST be a raw JSON object and nothing else.
You MUST respond with a JSON object containing 'aiObserverSkillRating', 'aiObserverSkillExplanation', and 'suggestedCategory'.

Example response format:
{
  "aiObserverSkillRating": 4,
  "aiObserverSkillExplanation": "Laporan ini jelas dan menyajikan risiko yang signifikan dengan baik.",
  "suggestedCategory": "Working at Height"
}

Now, analyze this report:
{{{observationData}}}
`,
});

const summarizeObservationDataFlow = ai.defineFlow(
  {
    name: 'summarizeObservationDataFlow',
    inputSchema: z.object({
        payload: SummarizeObservationDataInputSchema,
        userProfile: UserProfileSchema,
    }),
    outputSchema: SummarizeObservationDataOutputSchema,
  },
  async ({ payload, userProfile }) => {
    const model = userProfile.googleAiApiKey
        ? googleAI({ apiKey: userProfile.googleAiApiKey }).model('gemini-1.5-flash-latest')
        : 'googleai/gemini-1.5-flash-latest';
    
    const response = await summarizeObservationPrompt(payload, { model });
    let output = response.output;

    if (!output) {
      throw new Error('AI analysis returned no structured output for observation.');
    }

    return {
        summary: 'Analisis ringkas tersedia di fitur "Analisis Mendalam".',
        suggestedRiskLevel: 'Low',
        suggestedCategory: findClosestMatch(output.suggestedCategory, OBSERVATION_CATEGORIES, 'Supervision'),
        aiObserverSkillRating: parseAndClampRating(output.aiObserverSkillRating),
        aiObserverSkillExplanation: output.aiObserverSkillExplanation || 'Penjelasan tidak tersedia.',
    };
  }
);

export async function summarizeObservationData(input: SummarizeObservationDataInput, userProfile: UserProfile): Promise<SummarizeObservationDataOutput> {
  return summarizeObservationDataFlow({ payload: input, userProfile });
}


// =================================================================================
// 2. DEEP OBSERVATION ANALYSIS FLOW (ON-DEMAND)
// =================================================================================

const deeperAnalysisPrompt = ai.definePrompt({
    name: 'deeperAnalysisPrompt',
    model: 'googleai/gemini-1.5-flash-latest',
    input: { schema: SummarizeObservationDataInputSchema }, // Re-use the same input schema
    output: { schema: DeeperAnalysisOutputSchema },
    config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
    },
    prompt: `You are a world-class HSSE expert analyst. Your task is to perform a detailed analysis of an observation report. Provide a concise but thorough analysis. Your response MUST be a raw JSON object only, in Bahasa Indonesia.

Analyze the provided observation data and generate the following points:

1.  "risks": A bulleted list of potential dangers and safety risks arising from the reported condition. Start each point with a hyphen (-).
2.  "suggestedActions": A bulleted list of clear, actionable recommendations for improvement or mitigation. Start each point with a hyphen (-).
3.  "rootCauseAnalysis": A brief, one-sentence analysis of the most likely root cause (e.g., procedure, training, equipment).
4.  "relevantRegulations": A bulleted list of **types** of safety standards that apply (e.g., "Standar Bekerja di Ketinggian", "Standar Keselamatan Listrik", "Prosedur Pengangkatan"). **Do not cite specific codes like 'OSHA 1926' or 'SNI 04-0225-2000'.** Focus on the general category of the standard.

Observation Data to Analyze:
{{{observationData}}}
`,
});

const analyzeDeeperObservationFlow = ai.defineFlow(
  {
    name: 'analyzeDeeperObservationFlow',
    inputSchema: z.object({
        payload: SummarizeObservationDataInputSchema,
        userProfile: UserProfileSchema,
    }),
    outputSchema: DeeperAnalysisOutputSchema,
  },
  async ({ payload, userProfile }) => {
    const model = userProfile.googleAiApiKey
        ? googleAI({ apiKey: userProfile.googleAiApiKey }).model('gemini-1.5-flash-latest')
        : 'googleai/gemini-1.5-flash-latest';
    
    const response = await deeperAnalysisPrompt(payload, { model });
    const output = response.output;

    if (!output) {
      throw new Error('AI deep analysis returned no structured output.');
    }
    return output;
  }
);

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
    inputSchema: z.object({
        payload: AnalyzeInspectionInputSchema,
        userProfile: UserProfileSchema,
    }),
    outputSchema: AnalyzeInspectionOutputSchema, // Still returns the full schema for type safety
  },
  async ({ payload, userProfile }) => {
    const model = userProfile.googleAiApiKey
        ? googleAI({ apiKey: userProfile.googleAiApiKey }).model('gemini-1.5-flash-latest')
        : 'googleai/gemini-1.5-flash-latest';

    const response = await summarizeInspectionPrompt(payload, { model });
    const output = response.output;

    if (!output) {
      throw new Error('AI analysis returned no structured output for inspection.');
    }

    // Compose the full output object, filling in "slower" fields with default values.
    return {
        summary: output.summary,
        risks: 'Analisis risiko tersedia di fitur "Analisis Mendalam".',
        suggestedActions: 'Saran tindakan tersedia di fitur "Analisis Mendalam".',
    };
  }
);

export async function analyzeInspectionData(input: AnalyzeInspectionInput, userProfile: UserProfile): Promise<AnalyzeInspectionOutput> {
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
    inputSchema: z.object({
        payload: AnalyzeInspectionInputSchema,
        userProfile: UserProfileSchema,
    }),
    outputSchema: AnalyzeInspectionOutputSchema,
  },
  async ({ payload, userProfile }) => {
    const model = userProfile.googleAiApiKey
        ? googleAI({ apiKey: userProfile.googleAiApiKey }).model('gemini-1.5-flash-latest')
        : 'googleai/gemini-1.5-flash-latest';

    const response = await deeperAnalysisInspectionPrompt(payload, { model });
    const output = response.output;

    if (!output) {
      throw new Error('AI deep inspection analysis returned no structured output.');
    }
    return output;
  }
);

export async function analyzeDeeperInspection(input: AnalyzeInspectionInput, userProfile: UserProfile): Promise<AnalyzeInspectionOutput> {
  return analyzeDeeperInspectionFlow({ payload: input, userProfile });
}
