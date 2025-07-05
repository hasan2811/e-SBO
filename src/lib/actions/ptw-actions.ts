
'use server';

import { adminDb, adminStorage } from '@/lib/firebase-admin';
import type { Ptw, UserProfile } from '@/lib/types';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';
import { id as indonesianLocale } from 'date-fns/locale';

export async function stampAndApprovePtw(ptwId: string, userProfile: UserProfile): Promise<{ success: boolean; message: string }> {
    if (!userProfile) {
        return { success: false, message: 'User not authenticated.' };
    }

    const ptwRef = adminDb.collection('ptws').doc(ptwId);

    try {
        const ptwSnap = await ptwRef.get();
        if (!ptwSnap.exists) {
            return { success: false, message: 'Permit to Work not found.' };
        }
        const ptw = ptwSnap.data() as Ptw;
        
        if (ptw.status !== 'Pending Approval') {
            return { success: false, message: `Permit is already ${ptw.status}.` };
        }

        // 1. Download the original PDF from Storage
        const bucket = adminStorage.bucket();
        
        // Correctly parse the file path from the full download URL
        const urlParts = ptw.jsaPdfUrl.split('/o/');
        if (urlParts.length < 2) {
            return { success: false, message: 'Invalid JSA PDF URL format.' };
        }
        const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
        
        const file = bucket.file(filePath);
        const [pdfBytes] = await file.download();

        // 2. Load the PDF and stamp it with pdf-lib
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];

        const approverText = `Approved by: ${userProfile.displayName} (${userProfile.position || 'N/A'})`;
        const dateText = `On: ${format(new Date(), 'd MMM yyyy, HH:mm', { locale: indonesianLocale })}`;
        
        const textSize = 8;
        const padding = 20;

        lastPage.drawText(approverText, {
            x: padding,
            y: padding + textSize + 5,
            size: textSize,
            font: helveticaFont,
            color: rgb(0.1, 0.1, 0.1),
        });

        lastPage.drawText(dateText, {
            x: padding,
            y: padding,
            size: textSize,
            font: helveticaFont,
            color: rgb(0.1, 0.1, 0.1),
        });

        const modifiedPdfBytes = await pdfDoc.save();

        // 3. Upload the modified PDF, overwriting the original
        await file.save(Buffer.from(modifiedPdfBytes), {
            metadata: {
                contentType: 'application/pdf',
            },
        });
        
        // 4. Update the Firestore document
        const approver = `${userProfile.displayName} (${userProfile.position || 'N/A'})`;
        await ptwRef.update({
            status: 'Approved',
            approver,
            approvedDate: new Date().toISOString(),
        });
        
        return { success: true, message: 'Permit approved and stamped successfully.' };

    } catch (error) {
        console.error(`Failed to approve and stamp PTW ${ptwId}:`, error);
        let errorMessage = 'An unexpected error occurred.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, message: errorMessage };
    }
}

    