
/**
 * @fileOverview Centralized Genkit AI initialization.
 * This file configures and exports a singleton `ai` instance for use across the application.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// The Gemini API key is now hardcoded as requested.
// PLEASE REPLACE THE "YOUR_..._HERE" PLACEHOLDER WITH YOUR ACTUAL KEY.
const geminiApiKey = "YOUR_GEMINI_API_KEY_HERE";

// Initialize and export the AI instance.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: geminiApiKey,
    }),
  ],
});
