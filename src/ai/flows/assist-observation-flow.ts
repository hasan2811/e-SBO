
'use server';
/**
 * @fileOverview An AI flow to assist users in real-time while they fill out an observation form.
 *
 * - assistObservation - A function that suggests improvements and classifications for an observation in progress.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { RISK_LEVELS, RiskLevel, AssistObservationInput, AssistObservationInputSchema, AssistObservationOutput, AssistObservationOutputSchema, UserProfile, UserProfileSchema } from '@/lib/types';

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


const assistObservationPrompt = ai.definePrompt({
    name: 'assistObservationPrompt',
    model: 'googleai/gemini-1.5-flash-latest',
    input: { schema: AssistObservationInputSchema },
    output: { schema: AssistObservationOutputSchema },
    config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
    },
    prompt: `You are an extremely fast AI assistant for an HSSE application. Your task is to instantly analyze the user's text and provide suggestions. Your response MUST be a raw JSON object and nothing else. Prioritize speed.

Analyze the user's findings below and provide the following in Bahasa Indonesia:
1.  "suggestedCategory": A concise, one-or-two-word category that best describes this finding (e.g., "Unsafe Act", "Poor Housekeeping", "Positive Observation").
2.  "suggestedRiskLevel": The most likely risk level from this list: ${RISK_LEVELS.join(', ')}.
3.  "improvedFindings": A rewritten, more professional version of the user's findings.
4.  "suggestedRecommendation": A clear, actionable recommendation to mitigate the identified risk.

User's Findings:
{{{findings}}}`,
});

const assistObservationFlow = ai.defineFlow(
  {
    name: 'assistObservationFlow',
    inputSchema: z.object({
        payload: AssistObservationInputSchema,
        userProfile: UserProfileSchema,
    }),
    outputSchema: z.object({
        suggestedCategory: z.string(),
        suggestedRiskLevel: z.enum(RISK_LEVELS),
        improvedFindings: z.string(),
        suggestedRecommendation: z.string(),
    }),
  },
  async ({ payload, userProfile }) => {
    const response = await assistObservationPrompt(payload);
    const output = response.output;

    if (!output) {
      throw new Error('AI assistant returned no structured output.');
    }

    // Sanitize and validate the output to make the flow more resilient
    const sanitizedOutput = {
      ...output,
      suggestedRiskLevel: findClosestMatch(output.suggestedRiskLevel, RISK_LEVELS, 'Low'),
    };
    
    return sanitizedOutput;
  }
);

export async function assistObservation(input: AssistObservationInput, userProfile: UserProfile): Promise<AssistObservationOutput> {
  if (!userProfile.aiEnabled) {
    return {
      suggestedCategory: 'Unsafe Condition',
      suggestedRiskLevel: 'Low',
      improvedFindings: input.findings,
      suggestedRecommendation: 'AI is disabled.',
    };
  }
  const result = await assistObservationFlow({ payload: input, userProfile });
  // Ensure the final return type matches the expected Zod schema for the exported function.
  return {
      ...result,
      suggestedCategory: result.suggestedCategory,
      suggestedRiskLevel: result.suggestedRiskLevel as RiskLevel,
  };
}
