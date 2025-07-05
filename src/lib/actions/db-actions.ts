
'use server';

import { adminDb, adminStorage } from '@/lib/firebase-admin';
import type { Observation, Inspection, Ptw, AllItems } from '@/lib/types';

// ==================================
// UPDATE ACTIONS
// ==================================
export async function updateObservationStatus({ observationId, actionData, userName, userPosition }: { observationId: string, actionData: { actionTakenDescription: string, actionTakenPhotoUrl?: string }, userName: string, userPosition: string }): Promise<Observation> {
  const observationDocRef = adminDb.collection('observations').doc(observationId);
  
  const docSnapBeforeUpdate = await observationDocRef.get();
  if (!docSnapBeforeUpdate.exists) throw new Error('Laporan observasi tidak ditemukan.');
  
  const closerName = `${userName} (${userPosition || 'N/A'})`;
  const updatedData: Partial<Observation> = {
      status: 'Completed',
      actionTakenDescription: actionData.actionTakenDescription,
      closedBy: closerName,
      closedDate: new Date().toISOString(),
  };
  if (actionData.actionTakenPhotoUrl) updatedData.actionTakenPhotoUrl = actionData.actionTakenPhotoUrl;
  
  await observationDocRef.update(updatedData);

  const updatedDocSnap = await observationDocRef.get();
  const finalData = { ...updatedDocSnap.data(), id: updatedDocSnap.id } as Observation;
  return finalData;
}

export async function updateInspectionStatus({ inspectionId, actionData, userName, userPosition }: { inspectionId: string, actionData: { actionTakenDescription: string, actionTakenPhotoUrl?: string }, userName: string, userPosition: string }): Promise<Inspection> {
    const inspectionDocRef = adminDb.collection('inspections').doc(inspectionId);
    
    const docSnapBeforeUpdate = await inspectionDocRef.get();
    if (!docSnapBeforeUpdate.exists) throw new Error('Laporan inspeksi tidak ditemukan.');

    const closerName = `${userName} (${userPosition || 'N/A'})`;
    const updatedData: Partial<Inspection> = {
        status: 'Pass',
        actionTakenDescription: actionData.actionTakenDescription,
        closedBy: closerName,
        closedDate: new Date().toISOString(),
    };
    if (actionData.actionTakenPhotoUrl) updatedData.actionTakenPhotoUrl = actionData.actionTakenPhotoUrl;
  
    await inspectionDocRef.update(updatedData);
    
    const updatedDocSnap = await inspectionDocRef.get();
    const finalData = { ...updatedDocSnap.data(), id: updatedDocSnap.id } as Inspection;
    return finalData;
}

export async function approvePtw({ ptwId, signatureDataUrl, approverName, approverPosition }: { ptwId: string, signatureDataUrl: string, approverName: string, approverPosition: string }): Promise<Ptw> {
    const ptwDocRef = adminDb.collection('ptws').doc(ptwId);
    const docSnap = await ptwDocRef.get();
    if (!docSnap.exists) throw new Error('Dokumen PTW tidak ditemukan.');

    const approver = `${approverName} (${approverPosition || 'N/A'})`;
    await ptwDocRef.update({
        status: 'Approved', signatureDataUrl, approver, approvedDate: new Date().toISOString(),
    });
    const updatedDocSnap = await ptwDocRef.get();
    const finalDocData = { ...updatedDocSnap.data(), id: updatedDocSnap.id } as Ptw;

    return finalDocData;
}

// ==================================
// DELETE ACTIONS
// ==================================
async function safeDeleteStorageFile(fileUrl: string | undefined | null) {
  if (!fileUrl || !fileUrl.startsWith('https://firebasestorage.googleapis.com')) return;
  try {
    const bucket = adminStorage.bucket();
    const fileHttpRef = new URL(fileUrl);
    const filePath = decodeURIComponent(fileHttpRef.pathname.split('/o/')[1]);
    
    if (!filePath) return;
    
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    if (exists) await file.delete();
  } catch (error) {
    console.error(`[safeDeleteStorageFile] Non-blocking error deleting file: ${fileUrl}`, error);
  }
}

export async function deleteItem(item: AllItems): Promise<{id: string}> {
  const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
  
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
      console.warn(`[deleteItem] Document with id ${item.id} in ${item.itemType}s not found. Skipping deletion.`);
      return { id: item.id };
  }

  await docRef.delete();

  if (item.itemType === 'observation' || item.itemType === 'inspection') {
    await safeDeleteStorageFile(item.photoUrl);
    if ('actionTakenPhotoUrl' in item && item.actionTakenPhotoUrl) {
        await safeDeleteStorageFile(item.actionTakenPhotoUrl);
    }
  } else if (item.itemType === 'ptw' && item.jsaPdfUrl) {
    await safeDeleteStorageFile(item.jsaPdfUrl);
  }
  
  return { id: item.id };
}


export async function deleteMultipleItems(items: AllItems[]): Promise<{deletedIds: string[]}> {
  if (items.length === 0) return { deletedIds: [] };

  const batch = adminDb.batch();
  const storageDeletePromises: Promise<any>[] = [];
  const deletedIds: string[] = [];

  for (const item of items) {
    const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
    batch.delete(docRef);
    deletedIds.push(item.id);

    if (item.itemType === 'observation' || item.itemType === 'inspection') {
      storageDeletePromises.push(safeDeleteStorageFile(item.photoUrl));
      if ('actionTakenPhotoUrl' in item && item.actionTakenPhotoUrl) {
        storageDeletePromises.push(safeDeleteStorageFile(item.actionTakenPhotoUrl));
      }
    } else if (item.itemType === 'ptw' && item.jsaPdfUrl) {
      storageDeletePromises.push(safeDeleteStorageFile(item.jsaPdfUrl));
    }
  }
  
  await Promise.all(storageDeletePromises);
  await batch.commit();
  
  return { deletedIds };
}
