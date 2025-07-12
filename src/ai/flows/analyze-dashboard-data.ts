
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
    output: { schema: AnalyzeDashboardDataOutputSchema },
    prompt: `You are a senior HSSE data analyst. Your task is to analyze the following project data summary and provide a fast, concise executive summary in Bahasa Indonesia.
Your response MUST be a raw JSON object containing a single key "analysis" with a string value.
The string value should be a bulleted list of the 3-4 most critical insights. Start each bullet point with a hyphen (-).

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
        const { output } = await analyzeDashboardPrompt({ summaryText });

        if (!output) {
          throw new Error('AI dashboard analysis returned no structured output.');
        }
        return output;
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
