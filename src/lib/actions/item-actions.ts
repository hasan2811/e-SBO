
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { deleteFile } from '@/lib/storage';
import { revalidatePath } from 'next/cache';
import type { Observation, Inspection, Ptw, AllItems, UserProfile } from '@/lib/types';
import { format } from 'date-fns';


// ==================================
// CREATE ACTIONS
// ==================================
type CreateObservationPayload = Omit<Observation, 'id' | 'itemType' | 'referenceId' | 'status' | 'category' | 'riskLevel' | 'aiStatus' | 'likes' | 'likeCount' | 'commentCount' | 'viewCount' | 'isSharedPublicly' | 'actionTakenDescription' | 'actionTakenPhotoUrl' | 'closedBy' | 'closedDate'>;
export async function createObservation(payload: CreateObservationPayload): Promise<Observation> {
    const referenceId = `OBS-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    // AI-handled fields are given sensible defaults.
    const observationData: Omit<Observation, 'id'> = {
        itemType: 'observation',
        ...payload,
        referenceId,
        category: 'Supervision', // Default category
        riskLevel: 'Low', // Default risk level
        status: 'Pending',
        aiStatus: 'n/a', // AI processing is disabled for now to ensure stability
        likes: [], likeCount: 0, commentCount: 0, viewCount: 0,
    };

    const docRef = await adminDb.collection('observations').add(observationData);
    const newObservation = { ...observationData, id: docRef.id };
    
    // Revalidate paths to update the UI
    revalidatePath(newObservation.projectId ? `/proyek/${newObservation.projectId}` : '/private', 'page');
    revalidatePath('/tasks', 'page');
    
    return newObservation;
}


type CreateInspectionPayload = Omit<Inspection, 'id' | 'itemType' | 'referenceId' | 'aiStatus' | 'actionTakenDescription' | 'actionTakenPhotoUrl' | 'closedBy' | 'closedDate'>;
export async function createInspection(payload: CreateInspectionPayload): Promise<Inspection> {
    const referenceId = `INSP-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const inspectionData: Omit<Inspection, 'id'> = {
        itemType: 'inspection',
        ...payload,
        referenceId,
        aiStatus: 'n/a', // AI processing is disabled for now
    };
    
    const docRef = await adminDb.collection('inspections').add(inspectionData);
    const newInspection = { ...inspectionData, id: docRef.id };

    revalidatePath(newInspection.projectId ? `/proyek/${newInspection.projectId}` : '/private', 'page');
    return newInspection;
}

type CreatePtwPayload = Omit<Ptw, 'id' | 'itemType' | 'referenceId' | 'status' | 'approver' | 'approvedDate' | 'rejectionReason' | 'signatureDataUrl'>;
export async function createPtw(payload: CreatePtwPayload): Promise<Ptw> {
    const referenceId = `PTW-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const ptwData: Omit<Ptw, 'id'> = {
        itemType: 'ptw',
        ...payload,
        referenceId,
        status: 'Pending Approval',
    };
    
    const docRef = await adminDb.collection('ptws').add(ptwData);
    const newPtw = { ...ptwData, id: docRef.id };
    revalidatePath(newPtw.projectId ? `/proyek/${newPtw.projectId}` : '/private', 'page');
    return newPtw;
}


// ==================================
// UPDATE ACTIONS
// ==================================
export async function updateObservationStatus({ observationId, actionData, user }: { observationId: string, actionData: { actionTakenDescription: string, actionTakenPhotoUrl?: string }, user: UserProfile }) {
  const closerName = `${user.displayName} (${user.position || 'N/A'})`;
  const updatedData: Partial<Observation> = {
      status: 'Completed',
      actionTakenDescription: actionData.actionTakenDescription,
      closedBy: closerName,
      closedDate: new Date().toISOString(),
  };
  
  const observationDocRef = adminDb.collection('observations').doc(observationId);
  if (actionData.actionTakenPhotoUrl) {
      updatedData.actionTakenPhotoUrl = actionData.actionTakenPhotoUrl;
  }
  
  await observationDocRef.update(updatedData);
  const updatedDoc = await observationDocRef.get();
  
  revalidatePath(updatedDoc.data()?.projectId ? `/proyek/${updatedDoc.data()?.projectId}` : '/private', 'page');
  revalidatePath('/tasks', 'page');
  return { ...updatedDoc.data(), id: updatedDoc.id } as Observation;
}

export async function updateInspectionStatus({ inspectionId, actionData, user }: { inspectionId: string, actionData: { actionTakenDescription: string, actionTakenPhotoUrl?: string }, user: UserProfile }) {
  const closerName = `${user.displayName} (${user.position || 'N/A'})`;
  const updatedData: Partial<Inspection> = {
      status: 'Pass',
      actionTakenDescription: actionData.actionTakenDescription,
      closedBy: closerName,
      closedDate: new Date().toISOString(),
  };

  const inspectionDocRef = adminDb.collection('inspections').doc(inspectionId);
  if (actionData.actionTakenPhotoUrl) {
      updatedData.actionTakenPhotoUrl = actionData.actionTakenPhotoUrl;
  }

  await inspectionDocRef.update(updatedData);
  const updatedDoc = await inspectionDocRef.get();
  
  revalidatePath(updatedDoc.data()?.projectId ? `/proyek/${updatedDoc.data()?.projectId}` : '/private', 'page');
  return { ...updatedDoc.data(), id: updatedDoc.id } as Inspection;
}

export async function approvePtw({ ptwId, signatureDataUrl, approverName, approverPosition }: { ptwId: string, signatureDataUrl: string, approverName: string, approverPosition: string }): Promise<Ptw> {
    const ptwDocRef = adminDb.collection('ptws').doc(ptwId);
    const approver = `${approverName} (${approverPosition || 'N/A'})`;
    
    await ptwDocRef.update({
        status: 'Approved', signatureDataUrl, approver, approvedDate: new Date().toISOString(),
    });

    const updatedDoc = await ptwDocRef.get();
    revalidatePath(updatedDoc.data()?.projectId ? `/proyek/${updatedDoc.data()?.projectId}` : '/private', 'page');
    return { ...updatedDoc.data(), id: updatedDoc.id } as Ptw;
}


// ==================================
// DELETE ACTIONS
// ==================================
export async function deleteItem(item: AllItems) {
  const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
  
  // Delete associated files from storage first
  if (item.itemType === 'observation' || item.itemType === 'inspection') {
    if (item.photoUrl && !item.photoUrl.includes('placehold.co')) await deleteFile(item.photoUrl);
    if (item.actionTakenPhotoUrl) await deleteFile(item.actionTakenPhotoUrl);
  } else if (item.itemType === 'ptw') {
    if (item.jsaPdfUrl) await deleteFile(item.jsaPdfUrl);
  }

  await docRef.delete();
  
  // Revalidate relevant paths
  revalidatePath(item.projectId ? `/proyek/${item.projectId}` : '/private', 'page');
  revalidatePath('/public', 'page');
  revalidatePath('/tasks', 'page');
}

export async function deleteMultipleItems(items: AllItems[]) {
    const batch = adminDb.batch();
    const filesToDelete: (string | undefined)[] = [];

    items.forEach(item => {
      const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
      batch.delete(docRef);
      if (item.itemType === 'observation' || item.itemType === 'inspection') {
        if (item.photoUrl && !item.photoUrl.includes('placehold.co')) filesToDelete.push(item.photoUrl);
        if (item.actionTakenPhotoUrl) filesToDelete.push(item.actionTakenPhotoUrl);
      } else if (item.itemType === 'ptw') {
        if (item.jsaPdfUrl) filesToDelete.push(item.jsaPdfUrl);
      }
    });

    // Delete files and commit batch in parallel for efficiency
    await Promise.all([
      ...filesToDelete.map(url => url ? deleteFile(url) : Promise.resolve()),
      batch.commit()
    ]);
    
    // Revalidate all potentially affected paths
    revalidatePath('/private', 'page');
    revalidatePath('/public', 'page');
    const projectIds = new Set(items.map(i => i.projectId).filter(Boolean));
    projectIds.forEach(id => revalidatePath(`/proyek/${id}`, 'page'));
    revalidatePath('/tasks', 'page');
}

// ==================================
// OTHER ACTIONS
// ==================================
export async function retryAiAnalysis(item: Observation | Inspection) {
    const docRef = adminDb.collection(`${item.itemType}s`).doc(item.id);
    await docRef.update({ aiStatus: 'failed' });
    const updatedDoc = await docRef.get();
    
    revalidatePath(item.projectId ? `/proyek/${item.projectId}` : '/private', 'page');
    return { ...updatedDoc.data(), id: updatedDoc.id } as AllItems;
}

export async function shareObservationToPublic(observation: Observation, userProfile: UserProfile) {
  if (observation.isSharedPublicly) {
      throw new Error("This observation has already been shared.");
  }
  
  const publicObservationData: Partial<Observation> = {
      ...observation,
      date: new Date().toISOString(),
      status: 'Pending',
      scope: 'public',
      projectId: null,
      originalId: observation.id,
      originalScope: observation.scope,
      sharedBy: userProfile.displayName,
      sharedByPosition: userProfile.position,
      likes: [],
      likeCount: 0,
      commentCount: 0,
      viewCount: 0,
  };

  // Explicitly delete properties that shouldn't be in the new public copy
  delete publicObservationData.id;
  delete publicObservationData.isSharedPublicly;
  delete publicObservationData.actionTakenDescription;
  delete publicObservationData.actionTakenPhotoUrl;
  delete publicObservationData.closedBy;
  delete publicObservationData.closedDate;
  
  const originalDocRef = adminDb.collection('observations').doc(observation.id);

  // Use a batch to ensure atomicity
  const batch = adminDb.batch();
  const newPublicDocRef = adminDb.collection('observations').doc(); // Create a new doc reference
  batch.set(newPublicDocRef, publicObservationData);
  batch.update(originalDocRef, { isSharedPublicly: true });
  await batch.commit();
  
  revalidatePath('/public', 'page');
  revalidatePath(observation.projectId ? `/proyek/${observation.projectId}` : '/private', 'page');
  
  const updatedDoc = await originalDocRef.get();
  return { ...updatedDoc.data(), id: updatedDoc.id } as Observation;
}
