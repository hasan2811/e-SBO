'use server';

import { summarizeObservationData, SummarizeObservationDataOutput } from '@/ai/flows/summarize-observation-data';
import type { Observation } from './types';

export async function getAiSummary(observation: Observation): Promise<SummarizeObservationDataOutput> {
  // PERINGATAN: Kunci API AI sekarang ditulis langsung di dalam kode.
  // Pastikan kunci ini tidak digunakan di tempat lain jika Anda memutuskan untuk menghapusnya.
  const apiKey = "AIzaSyDfwUsDhWnoywj0aYLxfLE2MDONCnI_gho";

  // Cek di bawah ini tidak lagi diperlukan karena kita sudah memasukkan kunci secara langsung.
  // Namun, kita tetap mendeklarasikan variabel 'apiKey' untuk berjaga-jaga jika ada
  // bagian lain dari sistem build yang memeriksanya, meskipun tidak digunakan langsung di sini.

  const observationData = `
    Location: ${observation.location}
    Company: ${observation.company}
    Category: ${observation.category}
    Status: ${observation.status}
    Risk Level: ${observation.riskLevel}
    Submitted By: ${observation.submittedBy}
    Date: ${new Date(observation.date).toLocaleString()}
    Findings: ${observation.findings}
    Recommendation: ${observation.recommendation}
  `;

  try {
    const result = await summarizeObservationData({ observationData });
    return result;
  } catch (error) {
    console.error('Detailed error in getAiSummary:', error);
    if (error instanceof Error) {
      // Propagate a more descriptive error message to the client.
      throw new Error(`Failed to generate AI summary. Reason: ${error.message}`);
    }
    throw new Error('Failed to generate AI summary due to an unknown error.');
  }
}