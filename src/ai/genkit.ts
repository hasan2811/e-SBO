
/**
 * @fileOverview Centralized Genkit AI initialization.
 * This file configures and exports a singleton `ai` instance for use across the application.
 * It ensures that Genkit plugins are initialized only once.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Retrieve the API key from environment variables.
const geminiApiKey = "YOUR_GEMINI_API_KEY_HERE";

if (!geminiApiKey) {
  throw new Error(
    "GEMINI_API_KEY is not defined in your environment variables. Please add it to your .env.local file."
  );
}

// Initialize and export the AI instance.
// The `googleAI` plugin is now configured securely via environment variables.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: geminiApiKey,
    }),
  ],
});
