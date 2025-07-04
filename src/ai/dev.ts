/**
 * @fileOverview This file is the entrypoint for the Genkit developer UI.
 *
 * It imports all the flow definitions so that they can be discovered and used in the UI.
 */
import '@/ai/flows/summarize-observation-data.ts';
import '@/ai/flows/assist-observation-flow.ts';
import '@/ai/flows/assist-inspection-flow.ts';
import '@/ai/flows/analyze-dashboard-data.ts';
import '@/ai/flows/smart-notify-flow.ts';
