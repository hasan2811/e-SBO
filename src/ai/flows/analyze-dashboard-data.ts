
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


// New schema for the prompt itself, where complex objects are pre-stringified.
const AnalyzeDashboardPromptInputSchema = z.object({
  totalObservations: z.number(),
  pendingPercentage: z.number(),
  criticalPercentage: z.number(),
  riskDistribution: z.string().describe("A JSON string representing the risk distribution."),
  companyDistribution: z.string().describe("A JSON string representing the company observation distribution."),
  dailyTrend: z.string().describe("A JSON string representing the daily observation trend for the last 7 days."),
});

const analyzeDashboardPrompt = ai.definePrompt({
    name: 'analyzeDashboardPrompt',
    model: 'googleai/gemini-1.5-flash-latest',
    input: { schema: AnalyzeDashboardPromptInputSchema },
    output: { schema: AnalyzeDashboardDataOutputSchema },
    config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
    },
    prompt: `You are a senior HSSE data analyst. Your task is to analyze project data and provide a fast, concise executive summary. Your response must be in Bahasa Indonesia and formatted as a raw JSON object only. Be direct and focus on the most critical insights.

Analyze the following data points:
- Total Observations: {{totalObservations}}
- Percentage of Pending Observations: {{pendingPercentage}}%
- Percentage of Critical Risk Observations: {{criticalPercentage}}%
- Risk Level Distribution: {{{riskDistribution}}}
- Observations by Company: {{{companyDistribution}}}
- Daily Trend (Last 7 Days): {{{dailyTrend}}}

Based on this data, provide the following insights in Bahasa Indonesia. Each point should be a bullet point starting with a hyphen (-).

1.  "keyTrends": Identify the 2-3 most significant high-level trends. Focus on major shifts, dominant categories, or consistent patterns.
2.  "emergingRisks": Pinpoint 1-2 potential new risks or areas that require immediate attention. Look for negative trends, concentrations of risk, or anomalies.
3.  "positiveHighlights": Find 1-2 positive developments. This could be a decrease in pending items, successful completion rates, or low critical findings.`,
});

const analyzeDashboardDataFlow = ai.defineFlow(
  {
    name: 'analyzeDashboardDataFlow',
    inputSchema: z.object({
        payload: AnalyzeDashboardDataInputSchema,
        userProfile: UserProfileSchema,
    }),
    outputSchema: AnalyzeDashboardDataOutputSchema,
  },
  async ({ payload, userProfile }) => {
    try {
        const promptInput = {
            ...payload,
            riskDistribution: JSON.stringify(payload.riskDistribution),
            companyDistribution: JSON.stringify(payload.companyDistribution),
            dailyTrend: JSON.stringify(payload.dailyTrend),
        };

        const response = await analyzeDashboardPrompt(promptInput);
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

export async function analyzeDashboardData(input: AnalyzeDashboardDataInput, userProfile: UserProfile): Promise<AnalyzeDashboardDataOutput> {
  if (!userProfile.aiEnabled) {
    throw new Error('AI features are disabled for this user.');
  }
  return analyzeDashboardDataFlow({ payload: input, userProfile });
}
