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
  risks: z.string().describe('A detailed analysis of potential hazards and risks, including root causes and consequences.'),
  suggestedActions: z.string().describe('Suggested actions based on the observation findings.'),
  relevantRegulations: z.string().describe('Analysis of relevant Indonesian national and international regulations, standards, or procedures that apply to the findings.'),
});
export type SummarizeObservationDataOutput = z.infer<typeof SummarizeObservationDataOutputSchema>;

export async function summarizeObservationData(input: SummarizeObservationDataInput): Promise<SummarizeObservationDataOutput> {
  return summarizeObservationDataFlow(input);
}

const summarizeObservationDataPrompt = ai.definePrompt({
  name: 'summarizeObservationDataPrompt',
  input: {schema: SummarizeObservationDataInputSchema},
  output: {schema: SummarizeObservationDataOutputSchema},
  prompt: `You are an expert HSSE (Health, Safety, Security, and Environment) analyst.
Analyze the following observation data from a safety report. Your task is to provide a professional and detailed analysis.

Based on the observation data provided, generate a JSON object with the following fields:
1.  "summary": A concise summary of the core findings.
2.  "risks": A detailed analysis of potential hazards. Describe the immediate risks, potential consequences if left unaddressed, and possible root causes. Be specific.
3.  "suggestedActions": Clear, actionable steps to mitigate the risks, based on the recommendation provided in the data.
4.  "relevantRegulations": Identify and explain relevant regulations or standards. This should include applicable Indonesian national regulations (e.g., UU, PP, Permenaker) and relevant international standards (e.g., ISO, OHSAS) that relate to the findings. Also, describe the standard procedure that should have been followed.

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
