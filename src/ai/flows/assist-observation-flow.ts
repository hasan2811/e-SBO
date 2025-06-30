'use server';
/**
 * @fileOverview An AI flow to assist users in real-time while they fill out an observation form.
 *
 * - assistObservation - A function that suggests improvements and classifications for an observation in progress.
 * - AssistObservationInput - The input type for the assistObservation function.
 * - AssistObservationOutput - The return type for the assistObservation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { RISK_LEVELS, OBSERVATION_CATEGORIES } from '@/lib/types';

export const AssistObservationInputSchema = z.object({
  findings: z.string().min(20).describe('The user-written findings from the observation report.'),
});
export type AssistObservationInput = z.infer<typeof AssistObservationInputSchema>;

export const AssistObservationOutputSchema = z.object({
  suggestedCategory: z.enum(OBSERVATION_CATEGORIES).describe('The most likely category for this finding.'),
  suggestedRiskLevel: z.enum(RISK_LEVELS).describe('The suggested risk level based on the finding.'),
  improvedFindings: z.string().describe('An improved, more professional version of the original findings text.'),
  suggestedRecommendation: z.string().describe('A suggested recommendation to address the findings.'),
});
export type AssistObservationOutput = z.infer<typeof AssistObservationOutputSchema>;

const assistObservationPrompt = ai.definePrompt({
    name: 'assistObservationPrompt',
    model: 'googleai/gemini-2.0-flash',
    input: { schema: AssistObservationInputSchema },
    output: { schema: AssistObservationOutputSchema },
    config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
    },
    prompt: `You are an AI assistant for an HSSE (Health, Safety, Security, and Environment) application. Your task is to help a user write a better observation report by analyzing their initial "findings" text. Your response must be in Indonesian and in a raw JSON object format.

Based on the user's findings, provide the following:
1.  "suggestedCategory": Analyze the text and determine the most appropriate category. Choose one from: ${OBSERVATION_CATEGORIES.join(', ')}.
2.  "suggestedRiskLevel": Based on the severity implied in the text, suggest a risk level. Choose one from: ${RISK_LEVELS.join(', ')}.
3.  "improvedFindings": Rewrite the user's findings to be more professional, clear, and objective. Use formal language (Bahasa Indonesia).
4.  "suggestedRecommendation": Based on the improved findings, write a clear, actionable recommendation to mitigate the identified risk.

User's Findings:
{{{findings}}}`,
});

const assistObservationFlow = ai.defineFlow(
  {
    name: 'assistObservationFlow',
    inputSchema: AssistObservationInputSchema,
    outputSchema: AssistObservationOutputSchema,
  },
  async (input) => {
    const response = await assistObservationPrompt(input);
    const output = response.output;

    if (!output) {
      throw new Error('AI assistant returned no structured output.');
    }
    return output;
  }
);

export async function assistObservation(input: AssistObservationInput): Promise<AssistObservationOutput> {
  return assistObservationFlow(input);
}
