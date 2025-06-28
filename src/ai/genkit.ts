import {genkit, type Genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

let ai: Genkit | undefined;

/**
 * Initializes and returns the Genkit instance using a singleton pattern.
 * This ensures that Genkit is initialized only once and only when needed,
 * which is safer for the Next.js build process.
 */
export function getGenkit() {
  if (!ai) {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('FATAL: The GOOGLE_API_KEY environment variable is not set. Please ensure it is configured in your App Hosting secrets.');
    }
    ai = genkit({
      plugins: [googleAI({apiKey: process.env.GOOGLE_API_KEY})],
    });
  }
  return ai;
}
