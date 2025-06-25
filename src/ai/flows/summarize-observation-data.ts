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
  summary: z.string().describe('A concise summary of the observation findings.'),
  risks: z.string().describe('Potential risks identified during the observation.'),
  suggestedActions: z.string().describe('Suggested actions based on the observation findings.'),
});
export type SummarizeObservationDataOutput = z.infer<typeof SummarizeObservationDataOutputSchema>;

export async function summarizeObservationData(input: SummarizeObservationDataInput): Promise<SummarizeObservationDataOutput> {
  return summarizeObservationDataFlow(input);
}

const summarizeObservationDataPrompt = ai.definePrompt({
  name: 'summarizeObservationDataPrompt',
  input: {schema: SummarizeObservationDataInputSchema},
  output: {schema: SummarizeObservationDataOutputSchema},
  prompt: `You are an AI assistant specializing in summarizing observation data from safety reports.
Analyze the following observation data and generate a JSON object containing a concise summary of the findings, potential risks identified based on findings and risk level, and suggested actionable steps based on the provided recommendation.

Observation Data:
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
