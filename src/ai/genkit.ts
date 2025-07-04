/**
 * @fileOverview Centralized Genkit AI initialization.
 * This file configures and exports a singleton `ai` instance for use across the application.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Initialize and export the AI instance.
export const ai = genkit({
  plugins: [
    googleAI({apiKey: 'AIzaSyDh2ckQS2Pu1YSP9fql9nnphCQ9a52XA24'}),
  ],
});
