'use server';

import { summarizeObservationData, SummarizeObservationDataOutput } from '@/ai/flows/summarize-observation-data';
import type { Observation } from './types';
import { storage } from '@/lib/firebase-admin';

export async function getAiSummary(observation: Observation): Promise<SummarizeObservationDataOutput> {
  const observationData = `
    Location: ${observation.location}
    Company: ${observation.company}
    Category: ${observation.category}
    Status: ${observation.status}
    Risk Level: ${observation.riskLevel}
    Submitted By: ${observation.submittedBy}
    Date: ${new Date(observation.date).toLocaleString()}
    Findings: ${observation.findings}
    Recommendation: ${observation.recommendation}
  `;

  try {
    const result = await summarizeObservationData({ observationData });
    return result;
  } catch (error) {
    console.error('Error getting AI summary:', error);
    throw new Error('Failed to generate AI summary.');
  }
}

/**
 * Receives file data from a browser form and uploads it to Firebase Storage.
 * This function now uploads the file buffer directly to avoid file system operations.
 * @param formData The FormData object containing the file and folder name.
 * @returns An object with the public URL of the uploaded file or an error message.
 */
export async function uploadFileFromBrowser(formData: FormData): Promise<{url: string} | {error: string}> {
  try {
    const file = formData.get('file') as File | null;
    const folder = formData.get('folder') as string | null;

    if (!file || !folder) {
      return { error: 'File or folder not provided in FormData.' };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const bucket = storage.bucket();
    const destination = `${folder}/${Date.now()}-${file.name}`;
    const fileInBucket = bucket.file(destination);
    
    // Upload the buffer directly to the file in the bucket
    await fileInBucket.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // Construct the public, permanent URL for the file
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media`;

    return { url: publicUrl };

  } catch (error) {
    console.error('Upload failed in server action:', error);
    if (error instanceof Error) {
       return { error: `Upload failed on the server: ${error.message}` };
    }
    return { error: 'An unknown error occurred during upload.' };
  }
}


/**
 * Generates a secure, short-lived URL for uploading a file to Firebase Storage.
 * @param filePath The desired path for the file in the storage bucket.
 * @param contentType The MIME type of the file to be uploaded.
 * @returns An object containing the signed URL for the upload and the eventual public URL for access.
 */
export async function getSecureUploadUrl(filePath: string, contentType: string) {
  // Use the Firebase Admin SDK to get a reference to the storage bucket.
  const bucket = storage.bucket();
  const file = bucket.file(filePath);

  // Define the options for the signed URL.
  const options = {
    version: 'v4' as const, // Use the V4 signing process.
    action: 'write' as const, // This URL is for writing (uploading) a file.
    expires: Date.now() + 15 * 60 * 1000, // The URL will be valid for 15 minutes.
    contentType, // The content type of the file must match the upload request.
  };

  try {
    // Generate the signed URL.
    const [signedUrl] = await file.getSignedUrl(options);

    // Construct the permanent public URL for the file. This is how it will be accessed after upload.
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media`;

    return { signedUrl, publicUrl };
  } catch (error) {
    console.error('Error getting signed URL:', error);
    throw new Error('Could not get secure upload URL.');
  }
}