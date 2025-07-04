
/**
 * @fileOverview Centralized Genkit AI initialization.
 * This file configures and exports a singleton `ai` instance for use across the application.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Initialize and export the AI instance.
// By not providing an `apiKey`, Genkit will automatically use Application
// Default Credentials, which is the standard and most reliable method for
// authentication when deployed on Google Cloud infrastructure like App Hosting.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});
