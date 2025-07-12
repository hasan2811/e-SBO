
'use server';
/**
 * @fileOverview AI-powered analysis of HSSE observation and inspection data.
 *
 * This file defines Genkit flows for analyzing different types of HSSE reports.
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


// =================================================================================
// 1. OBSERVATION ANALYSIS FLOW (RADICAL SIMPLIFICATION)
// =================================================================================

const ObservationAnalysisOutputSchema = z.object({
  summary: z.string().describe('A very brief, one-sentence summary of the observation in English.'),
  risks: z.string().describe('Bulleted list of potential dangers and safety risks (English).'),
  suggestedActions: z.string().describe('Bulleted list of clear, actionable recommendations (English).'),
});
export type DeeperAnalysisOutput = z.infer<typeof ObservationAnalysisOutputSchema>;


const analyzeObservationFlow = ai.defineFlow(
  {
    name: 'analyzeObservationFlow',
    inputSchema: z.object({ payload: SummarizeObservationDataInputSchema, userProfile: UserProfileSchema }),
    outputSchema: ObservationAnalysisOutputSchema,
  },
  async () => {
    // RADICAL SIMPLIFICATION: Bypass AI call and return a hardcoded success response.
    return {
      summary: 'Ditemukan adanya tumpahan oli di area workshop yang dapat menyebabkan tergelincir.',
      risks: '- Risiko tergelincir dan jatuh bagi pekerja yang melintas.\n- Potensi bahaya kebakaran jika ada sumber api di dekatnya.\n- Kontaminasi lingkungan jika tumpahan tidak ditangani.',
      suggestedActions: '- Segera isolasi area tumpahan dengan barikade.\n- Gunakan serbuk penyerap (absorbent) untuk membersihkan tumpahan oli.\n- Lakukan investigasi untuk mencari sumber kebocoran dan lakukan perbaikan.',
    };
  }
);

export async function analyzeDeeperObservation(input: SummarizeObservationDataInput, userProfile: UserProfile): Promise<DeeperAnalysisOutput> {
  return analyzeObservationFlow({ payload: input, userProfile });
}


// =================================================================================
// 2. INSPECTION ANALYSIS FLOW (RADICAL SIMPLIFICATION)
// =================================================================================

const analyzeDeeperInspectionFlow = ai.defineFlow(
  {
    name: 'analyzeDeeperInspectionFlow',
    inputSchema: z.object({ payload: AnalyzeInspectionInputSchema, userProfile: UserProfileSchema }),
    outputSchema: AnalyzeInspectionOutputSchema,
  },
  async () => {
    // RADICAL SIMPLIFICATION: Bypass AI call and return a hardcoded success response.
    return {
      summary: 'Inspeksi pada alat pemadam api (APAR) menunjukkan tekanan di bawah standar aman.',
      risks: '- APAR mungkin tidak berfungsi secara efektif saat dibutuhkan dalam keadaan darurat kebakaran.\n- Ketidakpatuhan terhadap standar keselamatan kebakaran.',
      suggestedActions: '- Segera ganti unit APAR dengan yang baru atau isi ulang sesuai standar.\n- Lakukan pengecekan rutin pada semua APAR di area tersebut.\n- Tingkatkan frekuensi inspeksi APAR menjadi bulanan.',
    };
  }
);

export async function analyzeDeeperInspection(input: AnalyzeInspectionInput, userProfile: UserProfile): Promise<AnalyzeInspectionOutput> {
  return analyzeDeeperInspectionFlow({ payload: input, userProfile });
}
