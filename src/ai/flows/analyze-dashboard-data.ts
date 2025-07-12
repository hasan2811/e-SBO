
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
        const { text } = await analyzeDashboardPrompt({ summaryText });

        if (!text) {
          throw new Error('AI dashboard analysis returned no text output.');
        }
        // Manually construct the expected output object from the raw text response
        return { analysis: text };
    } catch (error: any) {
        console.error("Dashboard Analysis Error:", error);
        throw new Error('An unexpected error occurred during dashboard analysis.');
    }
  }
);

export async function analyzeDashboardData(input: AnalyzeDashboardDataInput, userProfile: UserProfile): Promise<AnalyzeDashboardDataOutput> {
  if (!userProfile.aiEnabled) {
    throw new Error('AI features are disabled for this user.');
  }
  if (!input || input.trim() === '') {
    throw new Error('Cannot run analysis: The dashboard data summary is empty.');
  }
  return analyzeDashboardDataFlow({ summaryText: input, userProfile });
}
