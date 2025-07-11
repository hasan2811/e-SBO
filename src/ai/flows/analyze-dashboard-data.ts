
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
} from '@/lib/types';


const analyzeDashboardPrompt = ai.definePrompt({
    name: 'analyzeDashboardPrompt',
    model: 'googleai/gemini-pro',
    input: { schema: z.object({ summaryText: z.string() }) },
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

// This flow is now simplified to directly call the prompt without a complex input schema.
// It receives TypeScript types directly from the exported function.
const analyzeDashboardDataFlow = ai.defineFlow(
  {
    name: 'analyzeDashboardDataFlow',
    // No inputSchema here to avoid redundant validation and ambiguity.
    outputSchema: AnalyzeDashboardDataOutputSchema,
  },
  async ({ summaryText }: { summaryText: string }) => {
    try {
        // The call now correctly passes an object that matches the prompt's input schema.
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
        throw new Error('An unexpected error occurred during dashboard analysis.');
    }
  }
);

// This is the exported function that the client calls. It acts as the entry point.
export async function analyzeDashboardData(summaryText: AnalyzeDashboardDataInput, userProfile: UserProfile): Promise<AnalyzeDashboardDataOutput> {
  if (!userProfile.aiEnabled) {
    throw new Error('AI features are disabled for this user.');
  }
  // It passes the necessary data to the flow.
  return analyzeDashboardDataFlow({ summaryText });
}
