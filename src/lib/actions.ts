
'use server';

import { summarizeObservationData, SummarizeObservationDataOutput } from '@/ai/flows/summarize-observation-data';
import type { Observation, Inspection, Ptw } from './types';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';


export async function getAiSummary(observation: Observation): Promise<SummarizeObservationDataOutput> {
  // This function now correctly relies on the centralized Genkit configuration
  // which securely handles the API key via environment variables.

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

export async function addInspection(newInspection: Omit<Inspection, 'id'>): Promise<void> {
  try {
    const referenceId = `INSP-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const inspectionToSave = {
      ...newInspection,
      referenceId,
    };
    const inspectionCollection = collection(db, 'inspections');
    await addDoc(inspectionCollection, inspectionToSave);
  } catch (error) {
    console.error("Error adding inspection to Firestore: ", error);
    throw new Error("Could not save inspection.");
  }
}

export async function addPtw(newPtw: Omit<Ptw, 'id'>): Promise<void> {
  try {
    const referenceId = `PTW-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const ptwToSave = {
      ...newPtw,
      referenceId,
    };
    const ptwCollection = collection(db, 'ptws');
    await addDoc(ptwCollection, ptwToSave);
  } catch (error) {
    console.error("Error adding PTW to Firestore: ", error);
    throw new Error("Could not save PTW.");
  }
}
