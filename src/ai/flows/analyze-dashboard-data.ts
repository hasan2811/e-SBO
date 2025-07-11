
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
    AnalyzeDashboardDataInputSchema,
    AnalyzeDashboardDataOutput,
    AnalyzeDashboardDataOutputSchema,
    UserProfile,
    UserProfileSchema,
} from '@/lib/types';


const analyzeDashboardPrompt = ai.definePrompt({
    name: 'analyzeDashboardPrompt',
    model: 'googleai/gemini-1.5-flash',
    input: { schema: AnalyzeDashboardDataInputSchema },
    output: { schema: AnalyzeDashboardDataOutputSchema },
    config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
    },
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
  async ({ summaryText, userProfile }) => {
    try {
        const { output } = await analyzeDashboardPrompt({ summaryText });

        if (!output) {
          throw new Error('AI dashboard analysis returned no structured output.');
        }
        return output;
    } catch (error: any) {
        console.error("Dashboard Analysis Error:", error);
        const errorMessage = error.message?.toLowerCase() || '';
        if (errorMessage.includes('429') || errorMessage.includes('resource_exhausted')) {
             throw new Error("The API quota has been exhausted. Please contact the developer.");
        }
        if (errorMessage.includes('503') || errorMessage.includes('service_unavailable')) {
             throw new Error("The AI service is currently busy. Please try again in a moment.");
        }
        if (error.message.includes('not supported in this region')) {
            throw new Error("The configured AI model is not available in your current region.");
        }
        if (error.message.includes('safety concerns')) {
            throw new Error("AI analysis was blocked due to safety concerns in the input data.");
        }
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
