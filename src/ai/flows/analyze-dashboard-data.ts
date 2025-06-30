'use server';
/**
 * @fileOverview An AI flow to analyze aggregated dashboard data and generate insights.
 *
 * - analyzeDashboardData - A function that takes dashboard metrics and returns narrative insights.
 * - AnalyzeDashboardDataInput - The input type for the analyzeDashboardData function.
 * - AnalyzeDashboardDataOutput - The return type for the analyzeDashboardData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const AnalyzeDashboardDataInputSchema = z.object({
  totalObservations: z.number(),
  pendingPercentage: z.number(),
  criticalPercentage: z.number(),
  riskDistribution: z.array(z.object({ name: z.string(), count: z.number() })),
  companyDistribution: z.array(z.object({ name: z.string(), value: z.number() })),
  dailyTrend: z.array(z.object({ day: z.string(), pending: z.number(), completed: z.number() })),
});
export type AnalyzeDashboardDataInput = z.infer<typeof AnalyzeDashboardDataInputSchema>;

export const AnalyzeDashboardDataOutputSchema = z.object({
  keyTrends: z.string().describe('Bulleted list of the 2-3 most important overall trends (Bahasa Indonesia).'),
  emergingRisks: z.string().describe('Bulleted list of 1-2 potential new risks or areas needing attention (Bahasa Indonesia).'),
  positiveHighlights: z.string().describe('Bulleted list of 1-2 positive developments or successes (Bahasa Indonesia).'),
});
export type AnalyzeDashboardDataOutput = z.infer<typeof AnalyzeDashboardDataOutputSchema>;

const analyzeDashboardPrompt = ai.definePrompt({
    name: 'analyzeDashboardPrompt',
    model: 'googleai/gemini-2.0-flash',
    input: { schema: AnalyzeDashboardDataInputSchema },
    output: { schema: AnalyzeDashboardDataOutputSchema },
    config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
    },
    prompt: `You are a senior HSSE (Health, Safety, Security, and Environment) data analyst. Your task is to analyze a summary of project data and provide a concise executive summary for a manager. Your response must be in Indonesian and in a raw JSON object format.

Analyze the following data points:
- Total Observations: {{totalObservations}}
- Percentage of Pending Observations: {{pendingPercentage}}%
- Percentage of Critical Risk Observations: {{criticalPercentage}}%
- Risk Level Distribution: {{jsonStringify riskDistribution}}
- Observations by Company: {{jsonStringify companyDistribution}}
- Daily Trend (Last 7 Days): {{jsonStringify dailyTrend}}

Based on this data, provide the following insights in Bahasa Indonesia. Each point should be a bullet point starting with a hyphen (-).

1.  "keyTrends": Identify the 2-3 most significant high-level trends. Focus on major shifts, dominant categories, or consistent patterns.
2.  "emergingRisks": Pinpoint 1-2 potential new risks or areas that require immediate attention. Look for negative trends, concentrations of risk, or anomalies.
3.  "positiveHighlights": Find 1-2 positive developments. This could be a decrease in pending items, successful completion rates, or low critical findings.`,
});

const analyzeDashboardDataFlow = ai.defineFlow(
  {
    name: 'analyzeDashboardDataFlow',
    inputSchema: AnalyzeDashboardDataInputSchema,
    outputSchema: AnalyzeDashboardDataOutputSchema,
  },
  async (input) => {
    const response = await analyzeDashboardPrompt(input);
    const output = response.output;

    if (!output) {
      throw new Error('AI dashboard analysis returned no structured output.');
    }
    return output;
  }
);

export async function analyzeDashboardData(input: AnalyzeDashboardDataInput): Promise<AnalyzeDashboardDataOutput> {
  return analyzeDashboardDataFlow(input);
}
