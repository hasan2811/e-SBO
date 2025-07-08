
/**
 * @fileOverview Centralized Genkit AI initialization.
 * This file configures and exports a singleton `ai` instance for use across the application.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Your web app's Firebase configuration, with the correct storageBucket name.
const firebaseConfig = {
  apiKey: "AIzaSyD-P_1XOQ9xQOgxwMApClEFoqHcxs7fYPI",
};


// Initialize and export the AI instance.
// The API key is now expected to be in the process environment variables (e.g., .env file).
// This allows for a default key on the server while letting users override it.
export const ai = genkit({
  plugins: [
    googleAI({apiKey: process.env.GOOGLE_API_KEY ?? firebaseConfig.apiKey}),
  ],
});
