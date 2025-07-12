
'use server';
/**
 * @fileOverview An AI flow to analyze aggregated dashboard data and generate insights.
 *
 * - analyzeDashboardData - A function that takes dashboard metrics and returns narrative insights.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
    AnalyzeDashboardDataInput,
    AnalyzeDashboardDataOutput,
    AnalyzeDashboardDataOutputSchema,
    UserProfile,
    UserProfileSchema,
} from '@/lib/types';


const analyzeDashboardPrompt = ai.definePrompt({
    name: 'analyzeDashboardPrompt',
    model: 'googleai/gemini-1.5-flash',
    input: { schema: z.object({ summaryText: z.string() }) },
    config: {
        temperature: 0.1,
        safetySettings: [
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_ONLY_HIGH',
          },
        ],
    },
    prompt: `You are a senior HSSE data analyst. Your task is to analyze the following project data summary and provide a fast, concise executive summary in Bahasa Indonesia.
Your response MUST be a bulleted list of the 3-4 most critical insights. Start each bullet point with a hyphen (-). Do NOT wrap your response in JSON or any other special formatting.

Analyze this data:
{{{summaryText}}}
`,
});

const analyzeDashboardDataFlow = ai.defineFlow(
  {
    name: 'analyzeDashboardDataFlow',
    inputSchema: z.object({
      summaryText: z.string(),
      userProfile: UserProfileSchema,
    }),
    outputSchema: AnalyzeDashboardDataOutputSchema,
  },
  async ({ summaryText }) => {
    try {
        console.log('[analyzeDashboardDataFlow] Raw prompt text:', summaryText);
        const { text } = await analyzeDashboardPrompt({ summaryText });
        console.log('[analyzeDashboardDataFlow] Raw AI response text:', text);

        if (!text) {
          throw new Error('AI dashboard analysis returned no text output.');
        }
        // Manually construct the expected output object from the raw text response
        return { analysis: text };
    } catch (error: any) {
        console.error("Dashboard Analysis Error in Flow:", error);
        // Rethrow a more specific error to be caught by the calling function
        throw new Error(`Flow execution failed: ${error.message}`);
    }
  }
);

export async function analyzeDashboardData(input: AnalyzeDashboardDataInput, userProfile: UserProfile): Promise<AnalyzeDashboardDataOutput> {
  if (!userProfile.aiEnabled) {
    // Return a structured error or a default message if AI is disabled
    return { analysis: "AI features are disabled for this user." };
  }
  if (!input || input.trim() === '') {
    // Return a structured error or a default message for empty input
     return { analysis: "Cannot run analysis: The dashboard data summary is empty." };
  }

  try {
    const result = await analyzeDashboardDataFlow({ summaryText: input, userProfile });
    return result;
  } catch (error: any) {
      console.error("Error calling analyzeDashboardDataFlow:", error);
      // Provide a user-friendly error message in the expected format
      return { analysis: `An unexpected error occurred during dashboard analysis.` };
  }
}
