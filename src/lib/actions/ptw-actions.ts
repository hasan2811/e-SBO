
'use server';

import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Buffer } from 'buffer';
import type { Ptw } from '@/lib/types';
import { format } from 'date-fns';
import QRCode from 'qrcode';

/**
 * Approves a PTW, stamps the associated JSA PDF with a signature and approver info,
 * and updates the Firestore document.
 * @param ptw The PTW object being approved.
 * @param approverName The name of the person approving the PTW.
 * @param signatureDataUrl The signature as a base64 data URL.
 */
export async function approvePtwAndStampPdf(ptw: Ptw, approverName: string, signatureDataUrl: string): Promise<{ stampedPdfUrl: string }> {
  try {
    const bucket = adminStorage.bucket();

    if (!ptw.jsaPdfStoragePath) {
      throw new Error('Original JSA PDF path is missing. Cannot process approval.');
    }
    const originalFile = bucket.file(ptw.jsaPdfStoragePath);
    const [originalPdfBuffer] = await originalFile.download();

    const pdfDoc = await PDFDocument.load(originalPdfBuffer);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // --- Define paths and URLs before stamping ---
    // Standardize storage path and use the unique referenceId for the filename
    const stampedFileName = `${ptw.referenceId}.pdf`;
    const stampedFilePath = `projects/${ptw.projectId}/stamped-jsa/${stampedFileName}`;

    // Construct the public URL manually for the QR code.
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${stampedFilePath}`;

    // --- Generate QR Code ---
    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, { errorCorrectionLevel: 'M' });
    const qrCodeImageBytes = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
    const qrCodeImage = await pdfDoc.embedPng(qrCodeImageBytes);
    const qrCodeDims = qrCodeImage.scale(0.4); // Scale QR code

    // --- Generate Signature ---
    const signatureImageBytes = Buffer.from(signatureDataUrl.split(',')[1], 'base64');
    const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
    const signatureDims = signatureImage.scale(0.25);

    // --- Prepare Fonts and Text ---
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const approvalText = `Digitally Approved By: ${approverName}`;
    const approvalDate = `Date: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`;

    // --- Stamp the PDF ---
    const { width } = firstPage.getSize();
    const margin = 30; // Consistent margin
    const textGap = 2;

    // Stamp Signature block on the bottom right
    firstPage.drawImage(signatureImage, {
      x: width - signatureDims.width - margin,
      y: margin,
      width: signatureDims.width,
      height: signatureDims.height,
    });
    firstPage.drawText(approvalText, {
      x: width - signatureDims.width - margin,
      y: margin - 10 - textGap,
      size: 8,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });
     firstPage.drawText(approvalDate, {
      x: width - signatureDims.width - margin,
      y: margin - 20 - textGap,
      size: 8,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Stamp QR Code on the bottom left
    firstPage.drawImage(qrCodeImage, {
        x: margin,
        y: margin - 5, // Align baseline with signature block
        width: qrCodeDims.width,
        height: qrCodeDims.height,
    });
    
    // --- Save and Upload ---
    const stampedPdfBytes = await pdfDoc.save();
    const stampedFile = bucket.file(stampedFilePath);
    await stampedFile.save(Buffer.from(stampedPdfBytes), {
      metadata: { contentType: 'application/pdf' },
    });

    // Make the file public to match the URL used in the QR code
    await stampedFile.makePublic();

    // --- Update Firestore ---
    const ptwDocRef = adminDb.collection('ptws').doc(ptw.id);
    const updateData: Partial<Ptw> = {
      status: 'Approved',
      approver: approverName,
      approvedDate: new Date().toISOString(),
      stampedPdfUrl: publicUrl,
      stampedPdfStoragePath: stampedFilePath,
      signatureDataUrl: signatureDataUrl,
    };
    await ptwDocRef.update(updateData);
    
    // The publicUrl is now confirmed and returned.
    return { stampedPdfUrl: publicUrl };

  } catch (error) {
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
