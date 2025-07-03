
'use server';
/**
 * @fileOverview AI-powered analysis of HSSE observation and inspection data.
 *
 * This file defines Genkit flows for analyzing different types of HSSE reports.
 * - summarizeObservationData: Analyzes a standard observation report.
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
    AnalyzeInspectionInput,
    AnalyzeInspectionInputSchema,
    AnalyzeInspectionOutput,
    AnalyzeInspectionOutputSchema,
    RiskLevel,
    ObservationCategory
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
    
    // First, try for an exact match (case-insensitive)
    const exactMatch = options.find(opt => opt.toLowerCase() === lowerValue);
    if (exactMatch) return exactMatch;

    // Next, try to see if the value contains one of the options
    const partialMatch = options.find(opt => lowerValue.includes(opt.toLowerCase()));
    if (partialMatch) return partialMatch;

    return defaultValue;
}


// =================================================================================
// 1. OBSERVATION ANALYSIS FLOW
// =================================================================================

const summarizeObservationPrompt = ai.definePrompt({
    name: 'summarizeObservationPrompt',
    model: 'googleai/gemini-2.0-flash',
    input: { schema: SummarizeObservationDataInputSchema },
    output: { schema: SummarizeObservationDataOutputSchema },
    config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
    },
    prompt: `You are an expert HSSE (Health, Safety, Security, and Environment) analyst. Your task is to analyze an observation report and provide a structured JSON output in Indonesian. Your response MUST be a raw JSON object only.

First, carefully analyze the user's observation data to understand the situation.

Then, perform the following analysis and generate the JSON object:

1.  **suggestedCategory**: Classify the observation into ONE of the following categories. Choose the most fitting one.
    *   'Unsafe Act': A person's action that deviates from standard procedures or is unsafe.
    *   'Unsafe Condition': A hazardous physical condition in the workplace.
    *   'Environmental': An issue related to environmental impact (e.g., spills, waste management).
    *   'Security': An issue related to physical or asset security.
    *   'General': A general safety observation that doesn't fit other categories.
    Your choice MUST be one of these: ${OBSERVATION_CATEGORIES.join(', ')}.

2.  **suggestedRiskLevel**: Based on the potential severity of the findings, classify the risk level. Choose ONE: 'Low', 'Medium', 'High', or 'Critical'.

3.  **summary**: A very brief, one-sentence summary of the core finding.

4.  **risks**: A bulleted list (using '-') of the main potential hazards and consequences if the issue is not addressed.

5.  **suggestedActions**: A bulleted list (using '-') of clear, actionable steps to mitigate the risk. Base this on the user's recommendation if available, but improve it.

6.  **relevantRegulations**: Identify 1-3 of the most relevant regulations (Indonesian laws like UU, PP, Permenaker, or international standards like ISO, OSHA, ANSI). For each, provide a bullet point (using '-') explaining its core relevance.

7.  **rootCauseAnalysis**: A brief analysis of the likely root cause of the reported issue.

8.  **observerAssessment**: An object containing:
    *   "rating": A number (1 to 5) assessing the observer's HSSE awareness based on the quality of their report. (1: Very Basic, 3: Competent, 5: Expert).
    *   "explanation": A brief, personalized assessment of the report, mentioning the observer's name and justifying the rating.

Here is the observation data to analyze:
{{{observationData}}}
`,
});

const summarizeObservationDataFlow = ai.defineFlow(
  {
    name: 'summarizeObservationDataFlow',
    inputSchema: SummarizeObservationDataInputSchema,
    outputSchema: SummarizeObservationDataOutputSchema,
  },
  async (input) => {
    const response = await summarizeObservationPrompt(input);
    let output = response.output;

    if (!output) {
      throw new Error('AI analysis returned no structured output for observation.');
    }

    // Sanitize the output to prevent errors from minor AI deviations.
    output = {
      ...output,
      suggestedCategory: findClosestMatch(output.suggestedCategory, OBSERVATION_CATEGORIES, 'General'),
      suggestedRiskLevel: findClosestMatch(output.suggestedRiskLevel, RISK_LEVELS, 'Low'),
    };
    
    return output;
  }
);

export async function summarizeObservationData(input: SummarizeObservationDataInput): Promise<SummarizeObservationDataOutput> {
  return summarizeObservationDataFlow(input);
}


// =================================================================================
// 2. INSPECTION ANALYSIS FLOW
// =================================================================================

const analyzeInspectionPrompt = ai.definePrompt({
    name: 'analyzeInspectionPrompt',
    model: 'googleai/gemini-2.0-flash',
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
