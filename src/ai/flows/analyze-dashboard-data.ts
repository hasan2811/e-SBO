
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
    input: { schema: AnalyzeDashboardDataInputSchema }, // The prompt now correctly expects a single string
    output: { schema: AnalyzeDashboardDataOutputSchema },
    config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
    },
    // The template is changed from {{{input}}} to {{input}} to correctly handle a single string input.
    prompt: `You are a senior HSSE data analyst. Your task is to analyze the following project data summary and provide a fast, concise executive summary in Bahasa Indonesia.
Your response MUST be a raw JSON object containing a single key "analysis" with a string value.
The string value should be a bulleted list of the 3-4 most critical insights. Start each bullet point with a hyphen (-).

Analyze this data:
{{input}}
`,
});

const analyzeDashboardDataFlow = ai.defineFlow(
  {
    name: 'analyzeDashboardDataFlow',
    inputSchema: z.object({
        summaryText: AnalyzeDashboardDataInputSchema, // Use the main input schema, which is z.string()
        userProfile: UserProfileSchema,
    }),
    outputSchema: AnalyzeDashboardDataOutputSchema,
  },
  async ({ summaryText, userProfile }) => {
    try {
        // Correctly pass the summaryText string to the prompt
        const response = await analyzeDashboardPrompt(summaryText); 
        const output = response.output;

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
        throw new Error('An unexpected error occurred during dashboard analysis.');
    }
  }
);

export async function analyzeDashboardData(summaryText: AnalyzeDashboardDataInput, userProfile: UserProfile): Promise<AnalyzeDashboardDataOutput> {
  if (!userProfile.aiEnabled) {
    throw new Error('AI features are disabled for this user.');
  }
  return analyzeDashboardDataFlow({ summaryText, userProfile });
}
