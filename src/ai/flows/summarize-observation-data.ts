'use server';
/**
 * @fileOverview AI-powered analysis of HSSE observation data.
 *
 * This file defines a Genkit flow that takes observation data and returns a structured analysis,
 * including a summary, risk assessment, suggested actions, and more.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { RISK_LEVELS } from '@/lib/types';

// 1. Define the input schema for the AI flow.
const SummarizeObservationDataInputSchema = z.object({
  observationData: z.string().describe('The raw text data of the observation report.'),
});
export type SummarizeObservationDataInput = z.infer<typeof SummarizeObservationDataInputSchema>;

// 2. Define the structured output schema the AI must follow.
const SummarizeObservationDataOutputSchema = z.object({
  summary: z.string().describe('Ringkasan singkat dari temuan inti dalam Bahasa Indonesia.'),
  risks: z.string().describe('Analisis potensi bahaya dan risiko dalam bentuk poin-poin singkat (Bahasa Indonesia).'),
  suggestedActions: z.string().describe('Saran tindakan perbaikan dalam bentuk poin-poin singkat (Bahasa Indonesia).'),
  relevantRegulations: z.string().describe('Poin-poin inti dari peraturan nasional & internasional yang relevan beserta penjelasan singkatnya (Bahasa Indonesia).'),
  suggestedRiskLevel: z.enum(RISK_LEVELS).describe('Saran tingkat risiko (Low, Medium, High, Critical) berdasarkan analisis temuan.'),
  rootCauseAnalysis: z.string().describe('Analisis singkat mengenai kemungkinan akar penyebab masalah (Bahasa Indonesia).'),
  impactAnalysis: z.object({
      rating: z.number().min(1).max(5).describe('Rating 1-5 dampak temuan bagi K3. 1: Sangat Rendah, 2: Rendah, 3: Sedang, 4: Tinggi, 5: Sangat Tinggi/Kritis.'),
      explanation: z.string().describe('Penjelasan singkat untuk rating dampak.'),
  }),
  observerAssessment: z.object({
      rating: z.number().min(1).max(5).describe('Rating 1-5 tingkat pemahaman observer. 1: Sangat Dasar, 2: Dasar, 3: Cukup Paham, 4: Paham, 5: Sangat Paham/Ahli.'),
      explanation: z.string().describe('Analisis personal tentang laporan observer, sebutkan namanya.'),
  })
});
export type SummarizeObservationDataOutput = z.infer<typeof SummarizeObservationDataOutputSchema>;


// 3. Define the prompt object. This is the most stable method.
const summarizePrompt = ai.definePrompt({
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
7.  "impactAnalysis": Sebuah objek berisi:
    - "rating": Angka **(1 sampai 5)** yang menilai dampak temuan ini bagi K3 jika diabaikan. (1: Sangat Rendah, 2: Rendah, 3: Sedang, 4: Tinggi, 5: Sangat Tinggi/Kritis).
    - "explanation": Penjelasan singkat untuk rating dampak tersebut.
8.  "observerAssessment": Sebuah objek berisi:
    - "rating": Angka **(1 sampai 5)** untuk menilai kualitas laporan dan pemahaman HSSE dari si observer. Nilai berdasarkan detail temuan, foto, dan rekomendasi. (1: Sangat Dasar, 2: Dasar, 3: Cukup Paham, 4: Paham, 5: Sangat Paham/Ahli).
    - "explanation": Berikan analisis singkat dan personal tentang laporan yang dibuat observer tersebut. **Sebutkan nama observer** dan jelaskan mengapa Anda memberikan rating tersebut.

Data Observasi:
{{{observationData}}}`,
});


// 4. Define the flow. Its only job is to execute the pre-configured prompt.
const summarizeObservationDataFlow = ai.defineFlow(
  {
    name: 'summarizeObservationDataFlow',
    inputSchema: SummarizeObservationDataInputSchema,
    outputSchema: SummarizeObservationDataOutputSchema,
  },
  async (input) => {
    const response = await summarizePrompt(input);
    const output = response.output;

    if (!output) {
      throw new Error('AI analysis returned no structured output.');
    }
    return output;
  }
);


// 5. Export a simple wrapper function for the client to call.
export async function summarizeObservationData(input: SummarizeObservationDataInput): Promise<SummarizeObservationDataOutput> {
  return summarizeObservationDataFlow(input);
}
