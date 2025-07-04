
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
// AI ANALYSIS HELPERS
// ==================================
const _runObservationAiAnalysis = async (observation: Observation) => {
  const observationDocRef = doc(db, 'observations', observation.id);
  const observationData = `
    Submitted By: ${observation.submittedBy}, Date: ${new Date(observation.date).toLocaleString()}, Findings: ${observation.findings}, User's Recommendation: ${observation.recommendation}
  `;
  try {
    const summary = await summarizeObservationData({ observationData });
    const aiData: Partial<Observation> = {
      riskLevel: summary.suggestedRiskLevel,
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
    };
    await updateDoc(observationDocRef, aiData);
    return { ...observation, ...aiData };
  } catch (error) {
    console.error("Failed to generate AI summary for observation:", error);
    await updateDoc(observationDocRef, { aiStatus: 'failed' });
    return { ...observation, aiStatus: 'failed' as const };
  }
};

const _runInspectionAiAnalysis = async (inspection: Inspection) => {
  const inspectionDocRef = doc(db, 'inspections', inspection.id);
  const inspectionData = `
    Equipment Name: ${inspection.equipmentName}, Type: ${inspection.equipmentType}, Location: ${inspection.location}, Status: ${inspection.status}, Submitted By: ${inspection.submittedBy}, Date: ${new Date(inspection.date).toLocaleString()}, Findings: ${inspection.findings}, Recommendation: ${inspection.recommendation || 'N/A'}
  `;
  try {
    const analysis = await analyzeInspectionData({ inspectionData });
    const aiData: Partial<Inspection> = {
        aiSummary: analysis.summary,
        aiRisks: analysis.risks,
        aiSuggestedActions: analysis.suggestedActions,
        aiStatus: 'completed' as const,
    };
    await updateDoc(inspectionDocRef, aiData);
    return { ...inspection, ...aiData };
  } catch (error) {
    console.error("Failed to generate AI analysis for inspection:", error);
    await updateDoc(inspectionDocRef, { aiStatus: 'failed' });
    return { ...inspection, aiStatus: 'failed' as const };
  }
};


// ==================================
// CREATE ACTIONS
// ==================================
export async function addObservation(formData: any, userProfile: UserProfile, projectId: string | null) {
  const scope: Scope = projectId ? 'project' : 'private';
  const referenceId = `OBS-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  
  const newObservationData: Omit<Observation, 'id'> = {
      itemType: 'observation',
      userId: userProfile.uid,
      date: new Date().toISOString(),
      status: 'Pending',
      submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
      location: formData.location as Location,
      company: formData.company as Company,
      category: formData.category as ObservationCategory,
      riskLevel: formData.riskLevel as RiskLevel,
      findings: formData.findings,
      recommendation: formData.recommendation || '',
      photoUrl: formData.photoUrl,
      referenceId,
      scope,
      projectId,
      // Temporarily set AI status to completed to avoid processing
      aiStatus: 'completed', // DIAGNOSTIC STEP
      likes: [],
      likeCount: 0,
      commentCount: 0,
      viewCount: 0,
  };

  const docRef = await addDoc(collection(db, 'observations'), newObservationData);
  
  // DIAGNOSTIC STEP: Temporarily disabled AI and notification triggers
  // const fullItemData = { ...newObservationData, id: docRef.id };
  // _runObservationAiAnalysis(fullItemData);

  // if (scope === 'project' && projectId) {
  //     triggerSmartNotify({
  //         observationId: docRef.id,
  //         projectId: projectId,
  //         company: formData.company,
  //         findings: formData.findings,
  //         submittedBy: userProfile.displayName,
  //     });
  // }

  revalidatePath(projectId ? `/proyek/${projectId}` : '/private');
}

export async function addInspection(formData: any, userProfile: UserProfile, projectId: string | null) {
  const scope: Scope = projectId ? 'project' : 'private';
  const referenceId = `INSP-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const newInspectionData: Omit<Inspection, 'id'> = {
      itemType: 'inspection',
      userId: userProfile.uid,
      date: new Date().toISOString(),
      submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
      location: formData.location,
      equipmentName: formData.equipmentName,
      equipmentType: formData.equipmentType,
      status: formData.status,
      findings: formData.findings,
      recommendation: formData.recommendation,
      photoUrl: formData.photoUrl,
      referenceId,
      scope,
      projectId,
      // Temporarily set AI status to completed to avoid processing
      aiStatus: 'completed', // DIAGNOSTIC STEP
  };

  const docRef = await addDoc(collection(db, 'inspections'), newInspectionData);
  
  // DIAGNOSTIC STEP: Temporarily disabled AI trigger
  // const fullItemData = { ...newInspectionData, id: docRef.id };
  // _runInspectionAiAnalysis(fullItemData);

  revalidatePath(projectId ? `/proyek/${projectId}` : '/private');
}

export async function addPtw(formData: any, userProfile: UserProfile, projectId: string | null) {
  const scope: Scope = projectId ? 'project' : 'private';
  const referenceId = `PTW-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const newPtwData: Omit<Ptw, 'id'> = {
      itemType: 'ptw',
      userId: userProfile.uid,
      date: new Date().toISOString(),
      submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
      location: formData.location,
      workDescription: formData.workDescription,
      contractor: formData.contractor,
      jsaPdfUrl: formData.jsaPdfUrl,
      status: 'Pending Approval',
      referenceId,
      scope,
      projectId,
  };

  await addDoc(collection(db, 'ptws'), newPtwData);
  revalidatePath(projectId ? `/proyek/${projectId}` : '/private');
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
  return { ...updatedDoc.data(), id: updatedDoc.id } as Observation;
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
  if (item.itemType === 'observation') {
    await deleteFile(item.photoUrl);
    if (item.actionTakenPhotoUrl) {
      await deleteFile(item.actionTakenPhotoUrl);
    }
  } else if (item.itemType === 'inspection') {
    await deleteFile(item.photoUrl);
  } else if (item.itemType === 'ptw') {
    await deleteFile(item.jsaPdfUrl);
  }
  await deleteDoc(docRef);
  revalidatePath(item.projectId ? `/proyek/${item.projectId}` : '/private');
}

export async function deleteMultipleItems(items: AllItems[]) {
    const batch = writeBatch(db);
    const filesToDelete: (string | undefined)[] = [];

    items.forEach(item => {
      const docRef = doc(db, `${item.itemType}s`, item.id);
      batch.delete(docRef);

      if (item.itemType === 'observation') {
        if (item.photoUrl) filesToDelete.push(item.photoUrl);
        if (item.actionTakenPhotoUrl) filesToDelete.push(item.actionTakenPhotoUrl);
      } else if (item.itemType === 'inspection') {
        if (item.photoUrl) filesToDelete.push(item.photoUrl);
      } else if (item.itemType === 'ptw') {
        if (item.jsaPdfUrl) filesToDelete.push(item.jsaPdfUrl);
      }
    });

    await Promise.all(filesToDelete.map(url => deleteFile(url)));
    await batch.commit();
    
    // Revalidate all relevant paths. A bit broad, but safer.
    revalidatePath('/private');
    const projectIds = new Set(items.map(i => i.projectId).filter(Boolean));
    projectIds.forEach(id => revalidatePath(`/proyek/${id}`));
}

// ==================================
// OTHER ACTIONS
// ==================================
export async function retryAiAnalysis(item: Observation | Inspection) {
    const docRef = doc(db, `${item.itemType}s`, item.id);
    await updateDoc(docRef, { aiStatus: 'processing' });
    let updatedItem;
    if (item.itemType === 'observation') {
        updatedItem = await _runObservationAiAnalysis(item as Observation);
    } else {
        updatedItem = await _runInspectionAiAnalysis(item as Inspection);
    }
    revalidatePath(item.projectId ? `/proyek/${item.projectId}` : '/private');
    return updatedItem;
}

export async function shareObservationToPublic(observation: Observation, userProfile: UserProfile) {
  if (observation.isSharedPublicly) {
      throw new Error("This observation has already been shared.");
  }
  
  // Create a clean copy for the public feed, removing sensitive/irrelevant data
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

  // Remove fields that should not be carried over to the public copy
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
