/**
 * @fileOverview Centralized Genkit AI initialization.
 * This file configures and exports a singleton `ai` instance for use across the application.
 * It ensures that Genkit plugins are initialized only once.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Validate that the Google API key is available in the environment.
// This is a server-side check that will prevent the app from starting
// if the key is not configured, which is a clear and immediate feedback loop.
if (!process.env.GOOGLE_API_KEY) {
  // In a local development environment, this might be expected if .env.local is not set up.
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'WARNING: The GOOGLE_API_KEY environment variable is not set. AI features will not work. Please create a .env.local file with this key.'
    );
  } else {
    // In production, this is a fatal error.
    throw new Error(
      'FATAL: The GOOGLE_API_KEY environment variable is not set. Please ensure it is configured in your App Hosting secrets.'
    );
  }
}

// Initialize and export the AI instance.
// The `googleAI` plugin is configured with the API key from environment variables.
// Genkit will only be initialized once due to Node.js module caching.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
    }),
  ],
});
