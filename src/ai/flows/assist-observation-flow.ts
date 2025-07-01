
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
import { RISK_LEVELS, OBSERVATION_CATEGORIES, RiskLevel, ObservationCategory } from '@/lib/types';

/**
 * Finds the best match for a given value from a list of options, or returns a default.
 * It's case-insensitive and checks for partial matches.
 * @param value The string value to match.
 * @param options The list of valid options.
 * @param defaultValue The default value to return if no match is found.
 * @returns The best matching option or the default value.
 */
function findClosestMatch<T extends string>(value: string | undefined, options: readonly T[], defaultValue: T): T {
    if (!value) return defaultValue;

    const lowerValue = value.toLowerCase().trim();
    
    // First, try for an exact match (case-insensitive)
    const exactMatch = options.find(opt => opt.toLowerCase() === lowerValue);
    if (exactMatch) return exactMatch;

    // Next, try to see if the value contains one of the options
    const partialMatch = options.find(opt => lowerValue.includes(opt.toLowerCase()));
    if (partialMatch) return partialMatch;

    return defaultValue;
}


export const AssistObservationInputSchema = z.object({
  findings: z.string().min(20).describe('The user-written findings from the observation report.'),
});
export type AssistObservationInput = z.infer<typeof AssistObservationInputSchema>;

export const AssistObservationOutputSchema = z.object({
  suggestedCategory: z.string().describe('The most likely category for this finding.'),
  suggestedRiskLevel: z.string().describe('The suggested risk level based on the finding.'),
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
    outputSchema: z.object({
        suggestedCategory: z.enum(OBSERVATION_CATEGORIES),
        suggestedRiskLevel: z.enum(RISK_LEVELS),
        improvedFindings: z.string(),
        suggestedRecommendation: z.string(),
    }),
  },
  async (input) => {
    const response = await assistObservationPrompt(input);
    const output = response.output;

    if (!output) {
      throw new Error('AI assistant returned no structured output.');
    }

    // Sanitize and validate the output to make the flow more resilient
    const sanitizedOutput = {
      ...output,
      suggestedCategory: findClosestMatch(output.suggestedCategory, OBSERVATION_CATEGORIES, 'General'),
      suggestedRiskLevel: findClosestMatch(output.suggestedRiskLevel, RISK_LEVELS, 'Low'),
    };
    
    return sanitizedOutput;
  }
);

export async function assistObservation(input: AssistObservationInput): Promise<AssistObservationOutput> {
  const result = await assistObservationFlow(input);
  // Ensure the final return type matches the expected Zod schema for the exported function.
  return {
      ...result,
      suggestedCategory: result.suggestedCategory as ObservationCategory,
      suggestedRiskLevel: result.suggestedRiskLevel as RiskLevel,
  };
}
