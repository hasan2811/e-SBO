
'use server';

import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Buffer } from 'buffer';
import type { Ptw } from '@/lib/types';
import { format } from 'date-fns';

/**
 * Approves a PTW, stamps the associated JSA PDF with a signature and approver info,
 * and updates the Firestore document.
 * @param ptw The PTW object being approved.
 * @param approverName The name of the person approving the PTW.
 * @param signatureDataUrl The signature as a base64 data URL.
 */
export async function approvePtwAndStampPdf(ptw: Ptw, approverName: string, signatureDataUrl: string): Promise<{ stampedPdfUrl: string }> {
  try {
    // Use the default bucket that was configured during admin initialization.
    const bucket = adminStorage.bucket();

    // 1. Get the original PDF file from storage using the robust storage path
    if (!ptw.jsaPdfStoragePath) {
      throw new Error('Original JSA PDF path is missing. Cannot process approval.');
    }
    const originalFile = bucket.file(ptw.jsaPdfStoragePath);
    const [originalPdfBuffer] = await originalFile.download();

    // 2. Load the PDF with pdf-lib
    const pdfDoc = await PDFDocument.load(originalPdfBuffer);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // 3. Get the signature image
    const signatureImageBytes = Buffer.from(signatureDataUrl.split(',')[1], 'base64');
    const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
    const signatureDims = signatureImage.scale(0.25); // Scale down the signature

    // 4. Get fonts and prepare text
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const approvalText = `Digitally Approved By: ${approverName}`;
    const approvalDate = `Date: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`;

    // 5. Stamp the PDF
    const { width } = firstPage.getSize();
    const margin = 40;
    const textGap = 2;
    const signatureY = margin;
    const textY = signatureY - 10 - textGap; // Position text below the signature
    
    firstPage.drawImage(signatureImage, {
      x: width - signatureDims.width - margin,
      y: signatureY,
      width: signatureDims.width,
      height: signatureDims.height,
    });
    firstPage.drawText(approvalText, {
      x: width - signatureDims.width - margin,
      y: textY,
      size: 8,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    firstPage.drawText(approvalDate, {
      x: width - signatureDims.width - margin,
      y: textY - 10, // Position date below the name
      size: 8,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    // 6. Save the new PDF to a buffer
    const stampedPdfBytes = await pdfDoc.save();

    // 7. Upload the new stamped PDF to a different path to avoid overwriting
    const stampedFileName = `stamped-${ptw.referenceId || ptw.id}.pdf`;
    const stampedFilePath = `stamped-jsa/${ptw.projectId}/${stampedFileName}`;
    const stampedFile = bucket.file(stampedFilePath);
    await stampedFile.save(Buffer.from(stampedPdfBytes), {
      metadata: { contentType: 'application/pdf' },
    });

    // Make the file public to get a download URL
    await stampedFile.makePublic();
    const publicUrl = stampedFile.publicUrl();

    // 8. Update the Firestore document
    const ptwDocRef = adminDb.collection('ptws').doc(ptw.id);
    const updateData: Partial<Ptw> = {
      status: 'Approved',
      approver: approverName,
      approvedDate: new Date().toISOString(),
      stampedPdfUrl: publicUrl,
      stampedPdfStoragePath: stampedFilePath,
      signatureDataUrl: signatureDataUrl, // Also save the signature data for display
    };
    await ptwDocRef.update(updateData);
    
    return { stampedPdfUrl: publicUrl };

  } catch (error) {
    // Add more detailed logging for future debugging.
    console.error('CRITICAL: PTW Stamping Failed.', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack available',
        ptwId: ptw.id,
        jsaPdfStoragePath: ptw.jsaPdfStoragePath,
    });

    if (error instanceof Error) {
        throw new Error(`Server-side stamping failed: ${error.message}`);
    }
    throw new Error('An unknown server error occurred during PDF stamping.');
  }
}
