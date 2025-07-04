
'use server';

import {
  collection,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { deleteFile } from '@/lib/storage';
import { revalidatePath } from 'next/cache';
import type { Observation, Inspection, Ptw, AllItems, Scope, Company, Location, RiskLevel, UserProfile, ObservationCategory } from '@/lib/types';
import {
  summarizeObservationData,
  analyzeInspectionData,
} from '@/ai/flows/summarize-observation-data';
import { triggerSmartNotify } from '@/ai/flows/smart-notify-flow';
import { format } from 'date-fns';


// ==================================
// CREATE ACTIONS
// ==================================
type CreateObservationPayload = Omit<Observation, 'id' | 'itemType' | 'referenceId' | 'status' | 'aiStatus' | 'likes' | 'likeCount' | 'commentCount' | 'viewCount' | 'isSharedPublicly' | 'actionTakenDescription' | 'actionTakenPhotoUrl' | 'closedBy' | 'closedDate'>;
export async function createObservation(payload: CreateObservationPayload): Promise<Observation> {
    const referenceId = `OBS-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const observationData: Omit<Observation, 'id'> = {
        itemType: 'observation',
        ...payload,
        referenceId,
        status: 'Pending',
        aiStatus: 'n/a', // AI is disabled for now
        likes: [], likeCount: 0, commentCount: 0, viewCount: 0,
    };
    const docRef = await addDoc(collection(db, 'observations'), observationData);
    const newObservation = { ...observationData, id: docRef.id };
    
    revalidatePath(newObservation.projectId ? `/proyek/${newObservation.projectId}` : '/private');
    revalidatePath('/tasks');
    return newObservation;
}


type CreateInspectionPayload = Omit<Inspection, 'id' | 'itemType' | 'referenceId' | 'aiStatus' | 'actionTakenDescription' | 'actionTakenPhotoUrl' | 'closedBy' | 'closedDate'>;
export async function createInspection(payload: CreateInspectionPayload): Promise<Inspection> {
    const referenceId = `INSP-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const inspectionData: Omit<Inspection, 'id'> = {
        itemType: 'inspection',
        ...payload,
        referenceId,
        aiStatus: 'n/a', // AI is disabled for now
    };
    const docRef = await addDoc(collection(db, 'inspections'), inspectionData);
    const newInspection = { ...inspectionData, id: docRef.id };
    
    revalidatePath(newInspection.projectId ? `/proyek/${newInspection.projectId}` : '/private');
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
    const docRef = await addDoc(collection(db, 'ptws'), ptwData);
    const newPtw = { ...ptwData, id: docRef.id };
    revalidatePath(newPtw.projectId ? `/proyek/${newPtw.projectId}` : '/private');
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
  
  const observationDocRef = doc(db, 'observations', observationId);
  if (actionData.actionTakenPhotoUrl) {
      updatedData.actionTakenPhotoUrl = actionData.actionTakenPhotoUrl;
  }
  await updateDoc(observationDocRef, updatedData);
  const updatedDoc = await getDoc(observationDocRef);
  
  revalidatePath(updatedDoc.data()?.projectId ? `/proyek/${updatedDoc.data()?.projectId}` : '/private');
  revalidatePath('/tasks');
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

  const inspectionDocRef = doc(db, 'inspections', inspectionId);
  if (actionData.actionTakenPhotoUrl) {
      updatedData.actionTakenPhotoUrl = actionData.actionTakenPhotoUrl;
  }
  await updateDoc(inspectionDocRef, updatedData);
  const updatedDoc = await getDoc(inspectionDocRef);
  
  revalidatePath(updatedDoc.data()?.projectId ? `/proyek/${updatedDoc.data()?.projectId}` : '/private');
  return { ...updatedDoc.data(), id: updatedDoc.id } as Inspection;
}

export async function approvePtw({ ptwId, signatureDataUrl, approverName, approverPosition }: { ptwId: string, signatureDataUrl: string, approverName: string, approverPosition: string }): Promise<Ptw> {
    const ptwDocRef = doc(db, 'ptws', ptwId);
    const approver = `${approverName} (${approverPosition || 'N/A'})`;
    await updateDoc(ptwDocRef, {
        status: 'Approved', signatureDataUrl, approver, approvedDate: new Date().toISOString(),
    });
    const updatedDoc = await getDoc(ptwDocRef);
    revalidatePath(updatedDoc.data()?.projectId ? `/proyek/${updatedDoc.data()?.projectId}` : '/private');
    return { ...updatedDoc.data(), id: updatedDoc.id } as Ptw;
}


// ==================================
// DELETE ACTIONS
// ==================================
export async function deleteItem(item: AllItems) {
  const docRef = doc(db, `${item.itemType}s`, item.id);
  if (item.itemType === 'observation' || item.itemType === 'inspection') {
    if (item.photoUrl && !item.photoUrl.includes('placehold.co')) await deleteFile(item.photoUrl);
    if (item.actionTakenPhotoUrl) await deleteFile(item.actionTakenPhotoUrl);
  } else if (item.itemType === 'ptw') {
    if (item.jsaPdfUrl) await deleteFile(item.jsaPdfUrl);
  }
  await deleteDoc(docRef);
  revalidatePath(item.projectId ? `/proyek/${item.projectId}` : '/private');
  revalidatePath('/public');
  revalidatePath('/tasks');
}

export async function deleteMultipleItems(items: AllItems[]) {
    const batch = writeBatch(db);
    const filesToDelete: (string | undefined)[] = [];

    items.forEach(item => {
      const docRef = doc(db, `${item.itemType}s`, item.id);
      batch.delete(docRef);
      if (item.itemType === 'observation' || item.itemType === 'inspection') {
        if (item.photoUrl && !item.photoUrl.includes('placehold.co')) filesToDelete.push(item.photoUrl);
        if (item.actionTakenPhotoUrl) filesToDelete.push(item.actionTakenPhotoUrl);
      } else if (item.itemType === 'ptw') {
        if (item.jsaPdfUrl) filesToDelete.push(item.jsaPdfUrl);
      }
    });

    await Promise.all(filesToDelete.map(url => url ? deleteFile(url) : Promise.resolve()));
    await batch.commit();
    
    revalidatePath('/private');
    revalidatePath('/public');
    const projectIds = new Set(items.map(i => i.projectId).filter(Boolean));
    projectIds.forEach(id => revalidatePath(`/proyek/${id}`));
    revalidatePath('/tasks');
}

// ==================================
// OTHER ACTIONS
// ==================================
export async function retryAiAnalysis(item: Observation | Inspection) {
    const docRef = doc(db, `${item.itemType}s`, item.id);
    await updateDoc(docRef, { aiStatus: 'processing' });
    let updatedItem: Observation | Inspection;
    
    const _runObservationAiAnalysis = async (observation: Observation) => {
      const observationDocRef = doc(db, 'observations', observation.id);
      const observationData = `
        Submitted By: ${observation.submittedBy}, Date: ${new Date(observation.date).toLocaleString()}, Findings: ${observation.findings}, User's Recommendation: ${observation.recommendation}
      `;
      try {
        const summary = await summarizeObservationData({ observationData });
        const aiData: Partial<Observation> = {
          category: summary.suggestedCategory,
          aiSummary: summary.summary,
          aiRisks: summary.risks,
          aiSuggestedActions: summary.suggestedActions,
          aiRelevantRegulations: summary.relevantRegulations,
          aiSuggestedRiskLevel: summary.suggestedRiskLevel,
          aiRootCauseAnalysis: summary.rootCauseAnalysis,
          aiObserverSkillRating: summary.observerAssessment.rating,
aiObserverSkillExplanation: summary.observerAssessment.explanation,
          aiStatus: 'completed' as const,
          riskLevel: summary.suggestedRiskLevel,
        };
        await updateDoc(observationDocRef, aiData);
      } catch (error) {
        console.error(`AI analysis failed for observation ${observation.id}:`, error);
        await updateDoc(observationDocRef, { aiStatus: 'failed' });
      }
    };
    
    if (item.itemType === 'observation') {
        _runObservationAiAnalysis(item as Observation);
        updatedItem = { ...item, aiStatus: 'processing' };
    } else {
        // AI analysis for inspections can be re-enabled here if needed
        updatedItem = { ...item, aiStatus: 'failed' };
    }
    revalidatePath(item.projectId ? `/proyek/${item.projectId}` : '/private');
    return updatedItem;
}

export async function shareObservationToPublic(observation: Observation, userProfile: UserProfile) {
  if (observation.isSharedPublicly) {
      throw new Error("This observation has already been shared.");
  }
  
  const publicObservationData = {
      ...observation,
      date: new Date().toISOString(),
      status: 'Pending' as const,
      scope: 'public' as const,
      projectId: null,
      originalId: observation.id,
      originalScope: observation.scope,
      sharedBy: userProfile.displayName,
      sharedByPosition: userProfile.position,
      likes: [],
      likeCount: 0,
      commentCount: 0,
      viewCount: 0,
      id: undefined, // Remove id for new doc
      isSharedPublicly: undefined,
      actionTakenDescription: undefined,
      actionTakenPhotoUrl: undefined,
      closedBy: undefined,
      closedDate: undefined,
  };

  // Explicitly delete properties that shouldn't be in the new public copy
  delete publicObservationData.id;
  delete publicObservationData.isSharedPublicly;
  delete publicObservationData.actionTakenDescription;
  delete publicObservationData.actionTakenPhotoUrl;
  delete publicObservationData.closedBy;
  delete publicObservationData.closedDate;

  await addDoc(collection(db, 'observations'), publicObservationData);
  const originalDocRef = doc(db, 'observations', observation.id);
  await updateDoc(originalDocRef, { isSharedPublicly: true });
  
  revalidatePath('/public');
  revalidatePath(observation.projectId ? `/proyek/${observation.projectId}` : '/private');
  
  const updatedDoc = await getDoc(originalDocRef);
  return { ...updatedDoc.data(), id: updatedDoc.id } as Observation;
}
