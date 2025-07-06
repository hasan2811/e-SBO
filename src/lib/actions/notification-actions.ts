
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { AllItems } from '@/lib/types';

interface NotificationParams {
    itemId: string;
    itemType: AllItems['itemType'];
    responsiblePersonUid: string;
    submitterName: string;
    description: string;
    projectId: string;
}

/**
 * Creates a centralized notification for item assignments.
 * This server action is called from client components after an item is submitted.
 * @param params - The notification parameters.
 */
export async function createAssignmentNotification(params: NotificationParams) {
    const { itemId, itemType, responsiblePersonUid, submitterName, description, projectId } = params;

    if (!responsiblePersonUid) {
        console.log("[createAssignmentNotification] No responsible person UID provided. Skipping notification.");
        return;
    }

    let message = '';
    const truncatedDescription = description.length > 40 ? `${description.substring(0, 40)}...` : description;


    switch (itemType) {
        case 'observation':
            message = `${submitterName} menugaskan Anda laporan observasi baru: "${truncatedDescription}"`;
            break;
        case 'inspection':
            message = `${submitterName} menugaskan Anda laporan inspeksi baru: "${truncatedDescription}"`;
            break;
        case 'ptw':
            message = `Anda ditugaskan oleh ${submitterName} untuk menyetujui PTW: "${truncatedDescription}"`;
            break;
        default:
            console.warn(`[createAssignmentNotification] Unknown item type: ${itemType}`);
            return;
    }

    try {
        const notificationData = {
            userId: responsiblePersonUid,
            itemId,
            itemType,
            projectId,
            message,
            isRead: false,
            createdAt: new Date().toISOString(),
        };
        await adminDb.collection('notifications').add(notificationData);
    } catch (error) {
        console.error("[createAssignmentNotification] Failed to create assignment notification:", {
            error,
            params,
        });
        // We don't re-throw the error to avoid crashing the background submission process.
        // The core item submission is more important than the notification.
    }
}
