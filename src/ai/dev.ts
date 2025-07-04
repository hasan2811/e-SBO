'use client';
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-observation-data.ts';
import '@/ai/flows/assist-observation-flow.ts';
import '@/ai/flows/analyze-dashboard-data.ts';
