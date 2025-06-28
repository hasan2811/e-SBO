
/**
 * @fileOverview Centralized Genkit AI initialization.
 * This file configures and exports a singleton `ai` instance for use across the application.
 * It ensures that Genkit plugins are initialized only once.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Initialize and export the AI instance.
// The `googleAI` plugin is configured with a hardcoded API key as per user request.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: 'AIzaSyD-P_1XOQ9xQOgxwMApClEFoqHcxs7fYPI', // Hardcoded API Key
    }),
  ],
});
