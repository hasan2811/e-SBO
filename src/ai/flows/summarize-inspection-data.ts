'use server';
/**
 * @fileOverview AI-powered summarization of inspection data.
 *
 * - summarizeInspectionData - A function that summarizes inspection findings, risks, and actions.
 * - SummarizeInspectionDataInput - The input type for the summarizeInspectionData function.
 * - SummarizeInspectionDataOutput - The return type for the summarizeInspectionData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeInspectionDataInputSchema = z.object({
  inspectionData: z.string().describe('The inspection data to summarize.'),
});
export type SummarizeInspectionDataInput = z.infer<typeof SummarizeInspectionDataInputSchema>;

const SummarizeInspectionDataOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the inspection findings.'),
  risks: z.string().describe('Potential risks identified during the inspection.'),
  suggestedActions: z.string().describe('Suggested actions based on the inspection findings.'),
});
export type SummarizeInspectionDataOutput = z.infer<typeof SummarizeInspectionDataOutputSchema>;

export async function summarizeInspectionData(input: SummarizeInspectionDataInput): Promise<SummarizeInspectionDataOutput> {
  return summarizeInspectionDataFlow(input);
}

const summarizeInspectionDataPrompt = ai.definePrompt({
  name: 'summarizeInspectionDataPrompt',
  input: {schema: SummarizeInspectionDataInputSchema},
  output: {schema: SummarizeInspectionDataOutputSchema},
  prompt: `You are an AI assistant specializing in summarizing inspection data.
  Given the following inspection data, provide a concise summary of the findings, potential risks identified, and suggested actions.
  \n  Inspection Data: {{{inspectionData}}}
  \n  Summary:
  Risks:
  Suggested Actions:`,
});

const summarizeInspectionDataFlow = ai.defineFlow(
  {
    name: 'summarizeInspectionDataFlow',
    inputSchema: SummarizeInspectionDataInputSchema,
    outputSchema: SummarizeInspectionDataOutputSchema,
  },
  async input => {
    const {output} = await summarizeInspectionDataPrompt(input);
    return output!;
  }
);
