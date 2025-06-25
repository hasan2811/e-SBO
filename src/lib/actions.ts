'use server';

import { summarizeObservationData, SummarizeObservationDataOutput } from '@/ai/flows/summarize-observation-data';
import type { Observation } from './types';
// NOTE: The server-side upload logic has been removed as it was unreliable in this environment.
// Uploads are now handled directly on the client using the Firebase Client SDK,
// which is a more standard and robust approach for web applications.

export async function getAiSummary(observation: Observation): Promise<SummarizeObservationDataOutput> {
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
    console.error('Error getting AI summary:', error);
    throw new Error('Failed to generate AI summary.');
  }
}
