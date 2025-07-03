
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
    prompt: `Anda adalah asisten HSSE yang cerdas, objektif, dan efisien. Tugas Anda adalah menganalisis data observasi dan memberikan poin-poin analisis yang jelas, langsung ke inti permasalahan, dan mudah dipahami dalam Bahasa Indonesia.
PENTING: Respons Anda harus berupa objek JSON mentah saja, tanpa penjelasan atau pemformatan tambahan.

Berdasarkan data observasi yang diberikan, hasilkan objek JSON dengan format berikut. Semua respons harus dalam Bahasa Indonesia.

1.  "summary": Berikan ringkasan yang sangat singkat (satu atau dua kalimat) dari temuan inti.
2.  "suggestedCategory": Berdasarkan temuan, tentukan kategori yang paling sesuai. Pilih salah satu dari: ${OBSERVATION_CATEGORIES.join(', ')}.
3.  "risks": Jelaskan potensi bahaya dan risiko dalam bentuk **poin-poin singkat yang diawali dengan tanda hubung (-)**. Fokus pada risiko utama dan konsekuensi paling signifikan jika tidak ditangani.
4.  "suggestedActions": Berikan saran tindakan yang jelas dan dapat dieksekusi dalam bentuk **poin-poin singkat yang diawali dengan tanda hubung (-)**, berdasarkan rekomendasi yang ada di data.
5.  "relevantRegulations": Identifikasi peraturan/standar yang paling relevan. Prioritaskan peraturan nasional Indonesia (UU, PP, Permenaker) yang terbaru. Jika tidak ada yang spesifik, cari dari standar internasional seperti **ISO, ILO, ANSI, ASTM, OSHA, ASME, atau JIS**. Sebutkan **hanya 1-3 aturan paling relevan**. Untuk setiap peraturan, sebutkan **inti aturannya dalam satu poin yang diawali dengan tanda hubung (-)**.
6.  "suggestedRiskLevel": Berdasarkan tingkat keparahan temuan, sarankan satu tingkat risiko yang paling sesuai: 'Low', 'Medium', 'High', atau 'Critical'.
7.  "rootCauseAnalysis": Lakukan analisis singkat untuk mengidentifikasi kemungkinan akar penyebab dari temuan yang dilaporkan.
8.  "observerAssessment": Sebuah objek berisi:
    - "rating": Angka **(1 sampai 5)** untuk menilai kualitas laporan dan pemahaman HSSE dari si observer. Nilai berdasarkan detail temuan, foto, dan rekomendasi. (1: Sangat Dasar, 2: Dasar, 3: Cukup Paham, 4: Paham, 5: Sangat Paham/Ahli).
    - "explanation": Berikan analisis singkat dan personal tentang laporan yang dibuat observer tersebut. **Sebutkan nama observer** dan jelaskan mengapa Anda memberikan rating tersebut.

Data Observasi:
{{{observationData}}}`,
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
