
'use server';
/**
 * @fileOverview AI-powered summarization of observation data.
 *
 * - summarizeObservationData - A function that summarizes observation findings, risks, and actions.
 * - SummarizeObservationDataInput - The input type for the summarizeObservationData function.
 * - SummarizeObservationDataOutput - The return type for the summarizeObservationData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { RISK_LEVELS } from '@/lib/types';

const SummarizeObservationDataInputSchema = z.object({
  observationData: z.string().describe('The observation data to summarize.'),
});
export type SummarizeObservationDataInput = z.infer<typeof SummarizeObservationDataInputSchema>;

const SummarizeObservationDataOutputSchema = z.object({
  summary: z.string().describe('Ringkasan singkat dari temuan inti dalam Bahasa Indonesia.'),
  risks: z.string().describe('Analisis potensi bahaya dan risiko dalam bentuk poin-poin singkat (Bahasa Indonesia).'),
  suggestedActions: z.string().describe('Saran tindakan perbaikan dalam bentuk poin-poin singkat (Bahasa Indonesia).'),
  relevantRegulations: z.string().describe('Poin-poin inti dari peraturan nasional & internasional yang relevan beserta penjelasan singkatnya (Bahasa Indonesia).'),
  suggestedRiskLevel: z.enum(RISK_LEVELS).describe('Saran tingkat risiko (Low, Medium, High, Critical) berdasarkan analisis temuan.'),
  rootCauseAnalysis: z.string().describe('Analisis singkat mengenai kemungkinan akar penyebab masalah (Bahasa Indonesia).'),
  impactAnalysis: z.object({
      rating: z.number().min(1).max(3).describe('Rating 1-3 dampak temuan bagi K3. 1: Rendah, 2: Sedang, 3: Signifikan.'),
      explanation: z.string().describe('Penjelasan singkat untuk rating dampak.'),
  }),
  observerAssessment: z.object({
      rating: z.number().min(1).max(3).describe('Rating 1-3 tingkat pemahaman observer. 1: Pemula, 2: Cukup Paham, 3: Sangat Paham.'),
      explanation: z.string().describe('Analisis personal tentang laporan observer, sebutkan namanya.'),
  })
});
export type SummarizeObservationDataOutput = z.infer<typeof SummarizeObservationDataOutputSchema>;

// Wrapper function to be called by the application
export async function summarizeObservationData(input: SummarizeObservationDataInput): Promise<SummarizeObservationDataOutput> {
  return summarizeObservationDataFlow(input);
}

// Define the flow, which now calls ai.generate() directly.
const summarizeObservationDataFlow = ai.defineFlow(
  {
    name: 'summarizeObservationDataFlow',
    inputSchema: SummarizeObservationDataInputSchema,
    outputSchema: SummarizeObservationDataOutputSchema,
  },
  async (input) => {
    // This prompt template is now a simple string.
    const prompt = `Anda adalah asisten HSSE yang cerdas, objektif, dan efisien. Tugas Anda adalah menganalisis data observasi dan memberikan poin-poin analisis yang jelas, langsung ke inti permasalahan, dan mudah dipahami dalam Bahasa Indonesia.
PENTING: Respons Anda harus berupa objek JSON mentah saja, tanpa penjelasan atau pemformatan tambahan.

Berdasarkan data observasi yang diberikan, hasilkan objek JSON dengan format berikut. Semua respons harus dalam Bahasa Indonesia.

1.  "summary": Berikan ringkasan yang sangat singkat (satu atau dua kalimat) dari temuan inti.
2.  "risks": Jelaskan potensi bahaya dan risiko dalam bentuk **poin-poin singkat**. Fokus pada risiko utama dan konsekuensi paling signifikan jika tidak ditangani.
3.  "suggestedActions": Berikan saran tindakan yang jelas dan dapat dieksekusi dalam bentuk **poin-poin singkat**, berdasarkan rekomendasi yang ada di data.
4.  "relevantRegulations": Identifikasi peraturan/standar nasional Indonesia (UU, PP, Permenaker) dan internasional (ISO, OHSAS) yang relevan. Untuk setiap peraturan, sebutkan **inti aturannya dalam satu poin** dan berikan penjelasan singkat.
5.  "suggestedRiskLevel": Berdasarkan tingkat keparahan temuan, sarankan satu tingkat risiko yang paling sesuai: 'Low', 'Medium', 'High', atau 'Critical'.
6.  "rootCauseAnalysis": Lakukan analisis singkat untuk mengidentifikasi kemungkinan akar penyebab dari temuan yang dilaporkan.
7.  "impactAnalysis": Sebuah objek berisi:
    - "rating": Angka (1, 2, atau 3) yang menilai dampak temuan ini bagi kesehatan dan keselamatan (K3) jika diabaikan. (1: Dampak Rendah, 2: Dampak Sedang, 3: Dampak Signifikan/Tinggi).
    - "explanation": Penjelasan singkat untuk rating dampak tersebut.
8.  "observerAssessment": Sebuah objek berisi:
    - "rating": Angka (1, 2, atau 3) untuk menilai kualitas laporan dan pemahaman HSSE dari si observer (lihat nama di "Submitted By"). Nilai berdasarkan detail temuan, foto, dan rekomendasi. (1: Pemula - laporan kurang detail, 2: Cukup Paham - laporan standar, 3: Sangat Paham - laporan detail dan komprehensif).
    - "explanation": Berikan analisis singkat dan personal tentang laporan yang dibuat observer tersebut. Sebutkan nama observer dan jelaskan mengapa Anda memberikan rating tersebut.

Data Observasi:
${input.observationData}`;

    // We call ai.generate() directly here, ensuring the model is always specified.
    const llmResponse = await ai.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        prompt: prompt,
        output: {
            schema: SummarizeObservationDataOutputSchema,
        },
        config: {
            safetySettings: [
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            ],
        },
    });

    const output = llmResponse.output;

    if (!output) {
      throw new Error('AI analysis returned no structured output.');
    }
    return output;
  }
);
