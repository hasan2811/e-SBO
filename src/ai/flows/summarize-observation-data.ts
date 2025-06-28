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

const SummarizeObservationDataInputSchema = z.object({
  observationData: z.string().describe('The observation data to summarize.'),
});
export type SummarizeObservationDataInput = z.infer<typeof SummarizeObservationDataInputSchema>;

const SummarizeObservationDataOutputSchema = z.object({
  summary: z.string().describe('Ringkasan singkat dari temuan inti dalam Bahasa Indonesia.'),
  risks: z.string().describe('Analisis potensi bahaya dan risiko dalam bentuk poin-poin singkat (Bahasa Indonesia).'),
  suggestedActions: z.string().describe('Saran tindakan perbaikan dalam bentuk poin-poin singkat (Bahasa Indonesia).'),
  relevantRegulations: z.string().describe('Poin-poin inti dari peraturan nasional & internasional yang relevan beserta penjelasan singkatnya (Bahasa Indonesia).'),
});
export type SummarizeObservationDataOutput = z.infer<typeof SummarizeObservationDataOutputSchema>;

export async function summarizeObservationData(input: SummarizeObservationDataInput): Promise<SummarizeObservationDataOutput> {
  return summarizeObservationDataFlow(input);
}

const summarizeObservationDataPrompt = ai.definePrompt({
  name: 'summarizeObservationDataPrompt',
  input: {schema: SummarizeObservationDataInputSchema},
  output: {schema: SummarizeObservationDataOutputSchema},
  model: 'googleai/gemini-1.5-flash-latest',
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  },
  prompt: `Anda adalah asisten HSSE yang cerdas dan efisien. Tugas Anda adalah menganalisis data observasi dan memberikan poin-poin analisis yang jelas, langsung ke inti permasalahan, dan mudah dipahami dalam Bahasa Indonesia.
PENTING: Respons Anda harus berupa objek JSON mentah saja, tanpa penjelasan atau pemformatan tambahan.

Berdasarkan data observasi yang diberikan, hasilkan objek JSON dengan format berikut. Semua respons harus dalam Bahasa Indonesia.

1.  "summary": Berikan ringkasan yang sangat singkat (satu atau dua kalimat) dari temuan inti.
2.  "risks": Jelaskan potensi bahaya dan risiko dalam bentuk **poin-poin singkat**. Fokus pada risiko utama dan konsekuensi paling signifikan jika tidak ditangani.
3.  "suggestedActions": Berikan saran tindakan yang jelas dan dapat dieksekusi dalam bentuk **poin-poin singkat**, berdasarkan rekomendasi yang ada di data.
4.  "relevantRegulations": Identifikasi peraturan/standar nasional Indonesia (UU, PP, Permenaker) dan internasional (ISO, OHSAS) yang relevan. Untuk setiap peraturan, sebutkan **inti aturannya dalam satu poin** dan berikan penjelasan singkat.

Data Observasi:
{{{observationData}}}
`,
});

const summarizeObservationDataFlow = ai.defineFlow(
  {
    name: 'summarizeObservationDataFlow',
    inputSchema: SummarizeObservationDataInputSchema,
    outputSchema: SummarizeObservationDataOutputSchema,
  },
  async input => {
    const {output} = await summarizeObservationDataPrompt(input);
    return output!;
  }
);
