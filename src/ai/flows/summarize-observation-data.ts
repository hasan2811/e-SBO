
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
    SummarizeObservationDataInput,
    SummarizeObservationDataInputSchema,
    SummarizeObservationDataOutput,
    SummarizeObservationDataOutputSchema,
    AnalyzeInspectionInput,
    AnalyzeInspectionInputSchema,
    AnalyzeInspectionOutput,
    AnalyzeInspectionOutputSchema
} from '@/lib/types';

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
2.  "risks": Jelaskan potensi bahaya dan risiko dalam bentuk **poin-poin singkat yang diawali dengan tanda hubung (-)**. Fokus pada risiko utama dan konsekuensi paling signifikan jika tidak ditangani.
3.  "suggestedActions": Berikan saran tindakan yang jelas dan dapat dieksekusi dalam bentuk **poin-poin singkat yang diawali dengan tanda hubung (-)**, berdasarkan rekomendasi yang ada di data.
4.  "relevantRegulations": Identifikasi peraturan/standar yang paling relevan. Prioritaskan peraturan nasional Indonesia (UU, PP, Permenaker) yang terbaru. Jika tidak ada yang spesifik, cari dari standar internasional seperti **ISO, ILO, ANSI, ASTM, OSHA, ASME, atau JIS**. Sebutkan **hanya 1-3 aturan paling relevan**. Untuk setiap peraturan, sebutkan **inti aturannya dalam satu poin yang diawali dengan tanda hubung (-)**.
5.  "suggestedRiskLevel": Berdasarkan tingkat keparahan temuan, sarankan satu tingkat risiko yang paling sesuai: 'Low', 'Medium', 'High', atau 'Critical'.
6.  "rootCauseAnalysis": Lakukan analisis singkat untuk mengidentifikasi kemungkinan akar penyebab dari temuan yang dilaporkan.
7.  "observerAssessment": Sebuah objek berisi:
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
    const output = response.output;

    if (!output) {
      throw new Error('AI analysis returned no structured output for observation.');
    }
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
