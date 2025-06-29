
'use server';

import { summarizeObservationData, SummarizeObservationDataOutput, analyzeInspectionData, AnalyzeInspectionOutput } from '@/ai/flows/summarize-observation-data';
import type { Observation, Inspection, Ptw } from './types';


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
  return summarizeObservationData({ observationData });
}


export async function getInspectionAiSummary(inspection: Inspection): Promise<AnalyzeInspectionOutput> {
    const inspectionData = `
      Equipment Name: ${inspection.equipmentName}
      Equipment Type: ${inspection.equipmentType}
      Location: ${inspection.location}
      Status: ${inspection.status}
      Submitted By: ${inspection.submittedBy}
      Date: ${new Date(inspection.date).toLocaleString()}
      Findings: ${inspection.findings}
      Recommendation: ${inspection.recommendation || 'N/A'}
    `;
    return analyzeInspectionData({ inspectionData });
}
