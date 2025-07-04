
'use server';
/**
 * @fileOverview AI-powered analysis of HSSE observation and inspection data.
 *
 * This file defines Genkit flows for analyzing different types of HSSE reports.
 * - summarizeObservationData: A fast, initial analysis of a standard observation report.
 * - analyzeDeeperObservation: A slower, more detailed analysis of an observation.
 * - analyzeInspectionData: Analyzes an equipment inspection report.
 */

import {ai} from '@/ai/genkit';
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
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
    },
    prompt: `You are an ultra-fast HSSE (Health, Safety, Security, Environment) AI Analyst.
Your ONLY job is to analyze the following observation report and provide a rating, a category, and a very short explanation.
Your response MUST be a raw JSON object and nothing else.
You MUST respond with a JSON object containing 'aiObserverSkillRating', 'aiObserverSkillExplanation', and 'suggestedCategory'.

1.  **aiObserverSkillRating**: First, rate the observer's report from 1 (unclear, low impact) to 5 (clear, high impact). This MUST be a number.
2.  **aiObserverSkillExplanation**: Second, write a single, very brief sentence in Bahasa Indonesia explaining your rating.
3.  **suggestedCategory**: Third, classify the report into ONE category from this list: ${OBSERVATION_CATEGORIES.join(', ')}.

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
    inputSchema: SummarizeObservationDataInputSchema,
    // The flow's final output still matches the full schema to maintain type safety with the client.
    outputSchema: SummarizeObservationDataOutputSchema,
  },
  async (input) => {
    const response = await summarizeObservationPrompt(input);
    let output = response.output;

    if (!output) {
      throw new Error('AI analysis returned no structured output for observation.');
    }

    // Compose the full output object. We fill in the "slower" fields with default values,
    // and use the AI's response for the "fast" fields.
    return {
        summary: 'Analisis ringkas tersedia di fitur "Analisis Mendalam".',
        suggestedRiskLevel: 'Low', // Default to 'Low'. The deep analysis can provide a better one.
        suggestedCategory: findClosestMatch(output.suggestedCategory, OBSERVATION_CATEGORIES, 'Supervision'),
        aiObserverSkillRating: parseAndClampRating(output.aiObserverSkillRating),
        aiObserverSkillExplanation: output.aiObserverSkillExplanation || 'Penjelasan tidak tersedia.',
    };
  }
);

export async function summarizeObservationData(input: SummarizeObservationDataInput): Promise<SummarizeObservationDataOutput> {
  return summarizeObservationDataFlow(input);
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
    inputSchema: SummarizeObservationDataInputSchema,
    outputSchema: DeeperAnalysisOutputSchema,
  },
  async (input) => {
    const response = await deeperAnalysisPrompt(input);
    const output = response.output;

    if (!output) {
      throw new Error('AI deep analysis returned no structured output.');
    }
    return output;
  }
);

export async function analyzeDeeperObservation(input: SummarizeObservationDataInput): Promise<DeeperAnalysisOutput> {
  return analyzeDeeperObservationFlow(input);
}


// =================================================================================
// 3. INSPECTION ANALYSIS FLOW
// =================================================================================

const analyzeInspectionPrompt = ai.definePrompt({
    name: 'analyzeInspectionPrompt',
    model: 'googleai/gemini-1.5-flash-latest',
    input: { schema: AnalyzeInspectionInputSchema },
    output: { schema: AnalyzeInspectionOutputSchema },
    config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
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

const analyzeInspectionDataFlow = ai.defineFlow(
  {
    name: 'analyzeInspectionDataFlow',
    inputSchema: AnalyzeInspectionInputSchema,
    outputSchema: AnalyzeInspectionOutputSchema,
  },
  async (input) => {
    const response = await analyzeInspectionPrompt(input);
    const output = response.output;

    if (!output) {
      throw new Error('AI analysis returned no structured output for inspection.');
    }
    return output;
  }
);

export async function analyzeInspectionData(input: AnalyzeInspectionInput): Promise<AnalyzeInspectionOutput> {
  return analyzeInspectionDataFlow(input);
}
