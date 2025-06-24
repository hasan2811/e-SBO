'use server';

import { summarizeInspectionData, SummarizeInspectionDataOutput } from '@/ai/flows/summarize-inspection-data';
import type { Inspection } from './types';

export async function getAiSummary(inspection: Inspection): Promise<SummarizeInspectionDataOutput> {
  const inspectionData = `
    Location: ${inspection.location}
    Category: ${inspection.category}
    Status: ${inspection.status}
    Submitted By: ${inspection.submittedBy}
    Date: ${inspection.date}
    Findings: ${inspection.findings}
  `;

  try {
    const result = await summarizeInspectionData({ inspectionData });
    return result;
  } catch (error) {
    console.error('Error getting AI summary:', error);
    throw new Error('Failed to generate AI summary.');
  }
}
