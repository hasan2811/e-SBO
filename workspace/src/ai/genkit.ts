
/**
 * @fileOverview Centralized Genkit AI initialization.
 * This file configures and exports a singleton `ai` instance for use across the application.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// The Gemini API key is now hardcoded as requested.
const geminiApiKey = "AIzaSyDfwUsDhWnoywj0aYLxfLE2MDONCnI_gho";

// Initialize and export the AI instance.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: geminiApiKey,
    }),
  ],
});
