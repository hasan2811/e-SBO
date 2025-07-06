
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
    const truncatedDescription = description.substring(0, 40);

    switch (itemType) {
        case 'observation':
            message = `${submitterName} menugaskan Anda laporan observasi baru: ${truncatedDescription}...`;
            break;
        case 'inspection':
            message = `${submitterName} menugaskan Anda laporan inspeksi baru: ${truncatedDescription}...`;
            break;
        case 'ptw':
            message = `Anda ditugaskan untuk menyetujui Izin Kerja dari ${submitterName}: ${truncatedDescription}...`;
            break;
        default:
            console.warn(`[createAssignmentNotification] Unknown item type: ${itemType}`);
            return;
    }

    try {
        await adminDb.collection('notifications').add({
            userId: responsiblePersonUid,
            itemId,
            itemType,
            projectId,
            message,
            isRead: false,
            createdAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("[createAssignmentNotification] Failed to create assignment notification:", {
            error,
            params,
        });
        // We don't re-throw the error to avoid crashing the background submission process.
        // The core item submission is more important than the notification.
    }
}

    