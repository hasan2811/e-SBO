
'use server';
/**
 * @fileOverview An AI flow to assist users in real-time while they fill out an inspection form.
 *
 * - assistInspection - A function that suggests improvements and classifications for an inspection in progress.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { INSPECTION_STATUSES, AssistInspectionInput, AssistInspectionInputSchema, AssistInspectionOutput, AssistInspectionOutputSchema, InspectionStatus, UserProfile, UserProfileSchema } from '@/lib/types';

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


const assistInspectionPrompt = ai.definePrompt({
    name: 'assistInspectionPrompt',
    model: 'googleai/gemini-1.5-flash',
    input: { schema: AssistInspectionInputSchema },
    output: { schema: AssistInspectionOutputSchema },
    prompt: `You are an extremely fast AI assistant for an HSSE application specializing in equipment inspection. Your task is to instantly analyze the user's text and provide suggestions. Your response MUST be a raw JSON object and nothing else. Prioritize speed.

Analyze the user's findings below and provide the following in Bahasa Indonesia:
1.  "suggestedStatus": The most fitting status from this list: ${INSPECTION_STATUSES.join(', ')}.
2.  "improvedFindings": A rewritten, more professional version of the user's findings.
3.  "suggestedRecommendation": A clear, actionable recommendation to mitigate the identified issue.

User's Findings:
{{{findings}}}`,
});

const assistInspectionFlow = ai.defineFlow(
  {
    name: 'assistInspectionFlow',
    inputSchema: z.object({
        payload: AssistInspectionInputSchema,
        userProfile: UserProfileSchema,
    }),
    outputSchema: z.object({
        suggestedStatus: z.enum(INSPECTION_STATUSES),
        improvedFindings: z.string(),
        suggestedRecommendation: z.string(),
    }),
  },
  async ({ payload }) => {
    try {
        const { output } = await assistInspectionPrompt(payload);

        if (!output) {
          throw new Error('AI assistant returned no structured output for inspection.');
        }

        // Sanitize and validate the output to make the flow more resilient
        const sanitizedOutput = {
          ...output,
          suggestedStatus: findClosestMatch(output.suggestedStatus, INSPECTION_STATUSES, 'Pass'),
        };
        
        return sanitizedOutput;
    } catch (error: any) {
        console.error("AI Assistance Error (Inspection):", error);
        throw new Error('An unexpected error occurred during AI assistance.');
    }
  }
);

export async function assistInspection(input: AssistInspectionInput, userProfile: UserProfile): Promise<AssistInspectionOutput> {
  if (!userProfile.aiEnabled) {
    return {
      suggestedStatus: 'Pass',
      improvedFindings: input.findings,
      suggestedRecommendation: 'AI is disabled.',
    };
  }
  const result = await assistInspectionFlow({ payload: input, userProfile });
  return {
      ...result,
      suggestedStatus: result.suggestedStatus as InspectionStatus,
  };
}
