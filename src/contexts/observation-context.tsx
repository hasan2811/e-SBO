
'use client';

import * as React from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  addDoc,
  where,
  Unsubscribe,
  DocumentReference,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { deleteFile, uploadFile } from '@/lib/storage';
import type { Observation, Inspection, Ptw, AllItems, Scope, Company, Location, RiskLevel } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useProjects } from '@/hooks/use-projects';
import {
  summarizeObservationData,
  analyzeInspectionData,
} from '@/ai/flows/summarize-observation-data';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { toggleLike, incrementViewCount as incrementViewCountAction } from '@/lib/actions/interaction-actions';

interface ObservationContextType {
  privateItems: AllItems[];
  projectItems: AllItems[];
  loading: boolean;
  addObservation: (
    formData: any,
    scope: Scope,
    projectId: string | null
  ) => void;
  addInspection: (
    formData: any,
    scope: Scope,
    projectId: string | null
  ) => void;
  addPtw: (
    formData: any,
    scope: Scope,
    projectId: string | null
  ) => void;
  updateObservation: (observation: Observation, actionData: { actionTakenDescription: string; actionTakenPhoto?: File }) => void;
  deleteObservation: (observation: Observation) => Promise<void>;
  deleteInspection: (inspection: Inspection) => Promise<void>;
  deletePtw: (ptw: Ptw) => Promise<void>;
  approvePtw: (
    ptw: Ptw,
    signatureDataUrl: string,
    approver: string,
  ) => Promise<void>;
  retryAiAnalysis: (item: Observation | Inspection) => Promise<void>;
  shareObservationToPublic: (observation: Observation) => Promise<void>;
  toggleLikeObservation: (observation: Observation) => Promise<void>;
  incrementViewCount: (observationId: string) => Promise<void>;
}

const ObservationContext = React.createContext<
  ObservationContextType | undefined
>(undefined);

// UNIFIED DATA MODEL: All items are at the root level. getDocRef is now simple.
const getDocRef = (item: AllItems): DocumentReference => {
    const collectionName = `${item.itemType}s`;
    return doc(db, collectionName, item.id);
};

export function ObservationProvider({ children }: { children: React.ReactNode }) {
    const { user, userProfile, loading: authLoading } = useAuth();
    const { projects, loading: projectsLoading } = useProjects();
    
    const [privateItems, setPrivateItems] = React.useState<AllItems[]>([]);
    const [projectItems, setProjectItems] = React.useState<AllItems[]>([]);
    const [privateItemsLoading, setPrivateItemsLoading] = React.useState(true);
    const [projectItemsLoading, setProjectItemsLoading] = React.useState(true);

    const sortItemsByDate = (items: AllItems[]) => {
      return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };
    
    // Listener for private items (unchanged)
    React.useEffect(() => {
        if (!user) {
            setPrivateItems([]);
            setPrivateItemsLoading(false);
            return;
        }

        setPrivateItemsLoading(true);
        const itemTypes: ('observation' | 'inspection' | 'ptw')[] = ['observation', 'inspection', 'ptw'];
        const unsubs: Unsubscribe[] = [];

        const listenerData = new Map<string, AllItems[]>();

        itemTypes.forEach(itemType => {
            const q = query(collection(db, `${itemType}s`), where('userId', '==', user.uid), where('scope', '==', 'private'));
            const unsub = onSnapshot(q, (snap) => {
                const items = snap.docs.map(d => ({ ...d.data(), id: d.id, itemType })) as AllItems[];
                listenerData.set(itemType, items);

                const combinedItems = Array.from(listenerData.values()).flat();
                setPrivateItems(sortItemsByDate(combinedItems));
                setPrivateItemsLoading(false);
            }, () => setPrivateItemsLoading(false));
            unsubs.push(unsub);
        });

        return () => {
            unsubs.forEach(unsub => unsub());
        };
    }, [user]);

    // REWRITTEN LISTENER: Project items are now fetched from root collections using an 'in' query.
    React.useEffect(() => {
        if (projectsLoading || !user) {
            setProjectItems([]);
            setProjectItemsLoading(false);
            return;
        }

        const projectIds = projects.map(p => p.id);
        if (projectIds.length === 0) {
            setProjectItems([]);
            setProjectItemsLoading(false);
            return;
        }

        setProjectItemsLoading(true);

        // Firestore 'in' query supports up to 30 values.
        // For this app, we'll assume a user is not in more than 30 projects.
        // A more robust solution would chunk the projectIds, but this is fine for now.
        const queryableProjectIds = projectIds.length > 30 ? projectIds.slice(0, 30) : projectIds;
        if(projectIds.length > 30) {
            console.warn("User is in more than 30 projects. Querying only the first 30.");
        }

        const itemTypes: ('observation' | 'inspection' | 'ptw')[] = ['observation', 'inspection', 'ptw'];
        const unsubs: Unsubscribe[] = [];
        const listenerData = new Map<string, AllItems[]>();

        itemTypes.forEach(itemType => {
            const collectionName = `${itemType}s`;
            const q = query(
                collection(db, collectionName),
                where('scope', '==', 'project'),
                where('projectId', 'in', queryableProjectIds)
            );

            const unsub = onSnapshot(q, (snap) => {
                const items = snap.docs.map(d => ({ ...d.data(), id: d.id, itemType })) as AllItems[];
                listenerData.set(itemType, items);

                const combinedItems = Array.from(listenerData.values()).flat();
                setProjectItems(sortItemsByDate(combinedItems));
                setProjectItemsLoading(false);
            }, (error) => {
                console.error(`Error fetching project ${collectionName}:`, error);
                setProjectItems([]);
                setProjectItemsLoading(false);
            });
            unsubs.push(unsub);
        });

        return () => {
            unsubs.forEach(unsub => unsub());
        };
    }, [user, projects, projectsLoading]);
    
    const _runObservationAiAnalysis = React.useCallback(async (observation: Observation) => {
      const observationDocRef = getDocRef(observation);
      const observationData = `
        Submitted By: ${observation.submittedBy}, Date: ${new Date(observation.date).toLocaleString()}, Findings: ${observation.findings}, User's Recommendation: ${observation.recommendation}
      `;

      try {
        const summary = await summarizeObservationData({ observationData });
        const aiData: Partial<Observation> = {
          // Update the main fields with AI suggestions
          riskLevel: summary.suggestedRiskLevel,
          category: summary.suggestedCategory,
          // Store the detailed analysis
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
      } catch (error) {
        console.error("Failed to generate AI summary for observation:", error);
        await updateDoc(observationDocRef, { aiStatus: 'failed' });
        toast({ variant: 'destructive', title: 'Observation AI Failed', description: 'Could not generate AI analysis.'});
      }
    }, []);

    const _runInspectionAiAnalysis = React.useCallback(async (inspection: Inspection) => {
      const inspectionDocRef = getDocRef(inspection);
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
      } catch (error) {
        console.error("Failed to generate AI analysis for inspection:", error);
        await updateDoc(inspectionDocRef, { aiStatus: 'failed' });
        toast({ variant: 'destructive', title: 'Inspection AI Failed', description: 'Could not generate AI analysis.'});
      }
    }, []);

    const addObservation = React.useCallback(async (formData: any, scope: Scope, projectId: string | null) => {
        if (!user || !userProfile) {
            toast({ variant: 'destructive', title: 'Not Authenticated', description: 'Anda harus login untuk mengirim.' });
            return;
        };
        
        toast({ title: 'Laporan Terkirim', description: `Observasi Anda sedang diproses.` });

        try {
            let photoUrl: string;
            if (formData.photo) {
              photoUrl = await uploadFile(formData.photo, 'observations', user.uid, () => {}, projectId);
            } else {
              photoUrl = 'https://placehold.co/600x400.png';
            }
            
            const referenceId = `OBS-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            
            const newObservationData: Omit<Observation, 'id'> = {
                itemType: 'observation',
                userId: user.uid,
                date: new Date().toISOString(),
                status: 'Pending',
                submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
                location: formData.location as Location,
                company: formData.company as Company,
                category: formData.category as ObservationCategory,
                riskLevel: formData.riskLevel as RiskLevel,
                findings: formData.findings,
                recommendation: formData.recommendation || '',
                photoUrl: photoUrl,
                referenceId,
                scope,
                projectId, // projectId is now a top-level field
                aiStatus: 'processing',
                likes: [],
                likeCount: 0,
                commentCount: 0,
                viewCount: 0,
            };
    
            const docRef = await addDoc(collection(db, 'observations'), newObservationData);
            
            const fullItemData = { ...newObservationData, id: docRef.id };
            _runObservationAiAnalysis(fullItemData);
            
            toast({ title: 'Sukses!', description: 'Laporan observasi baru berhasil disimpan.' });

        } catch (error) {
            console.error("Submission failed: ", error);
            toast({
                variant: 'destructive',
                title: 'Pengiriman Gagal',
                description: error instanceof Error ? error.message : 'Tidak dapat menyimpan observasi.',
            });
        }
    }, [user, userProfile, _runObservationAiAnalysis]);
    
    const addInspection = React.useCallback(async (formData: any, scope: Scope, projectId: string | null) => {
        if (!user || !userProfile) {
            toast({ variant: 'destructive', title: 'Not Authenticated', description: 'Anda harus login untuk mengirim.' });
            return;
        }

        toast({ title: 'Laporan Terkirim', description: `Laporan inspeksi Anda sedang diproses.` });

        try {
            const photoUrl = await uploadFile(formData.photo, 'inspections', user.uid, () => {}, projectId);
            const referenceId = `INSP-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
            const newInspectionData: Omit<Inspection, 'id'> = {
                itemType: 'inspection',
                userId: user.uid,
                date: new Date().toISOString(),
                submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
                location: formData.location,
                equipmentName: formData.equipmentName,
                equipmentType: formData.equipmentType,
                status: formData.status,
                findings: formData.findings,
                recommendation: formData.recommendation,
                photoUrl: photoUrl,
                referenceId,
                scope,
                projectId,
                aiStatus: 'processing',
            };
    
            const docRef = await addDoc(collection(db, 'inspections'), newInspectionData);
    
            const fullItemData = { ...newInspectionData, id: docRef.id };
            _runInspectionAiAnalysis(fullItemData);
            
            toast({ title: 'Sukses!', description: 'Laporan inspeksi baru berhasil disimpan.' });

        } catch (error) {
            console.error("Submission failed: ", error);
            toast({ variant: 'destructive', title: 'Pengiriman Gagal', description: error instanceof Error ? error.message : 'Tidak dapat menyimpan laporan.' });
        }
    }, [user, userProfile, _runInspectionAiAnalysis]);

    const addPtw = React.useCallback(async (formData: any, scope: Scope, projectId: string | null) => {
        if (!user || !userProfile) {
            toast({ variant: 'destructive', title: 'Not Authenticated', description: 'Anda harus login untuk mengirim.' });
            return;
        }

        toast({ title: 'PTW Diajukan', description: `Izin kerja Anda sedang diproses.` });

        try {
            const jsaPdfUrl = await uploadFile(formData.jsaPdf, 'ptw-jsa', user.uid, () => {}, projectId);
            const referenceId = `PTW-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
            const newPtwData: Omit<Ptw, 'id'> = {
                itemType: 'ptw',
                userId: user.uid,
                date: new Date().toISOString(),
                submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
                location: formData.location,
                workDescription: formData.workDescription,
                contractor: formData.contractor,
                jsaPdfUrl,
                status: 'Pending Approval',
                referenceId,
                scope,
                projectId,
            };
    
            await addDoc(collection(db, 'ptws'), newPtwData);
            toast({ title: 'Sukses!', description: 'Permit to Work baru berhasil diajukan.' });

        } catch (error) {
            console.error("Submission failed: ", error);
            toast({ variant: 'destructive', title: 'Pengajuan Gagal', description: error instanceof Error ? error.message : 'Tidak dapat menyimpan PTW.' });
        }
    }, [user, userProfile]);

    const updateObservation = React.useCallback(async (
        observation: Observation, 
        actionData: { actionTakenDescription: string, actionTakenPhoto?: File }
    ) => {
        if (!user || !userProfile) {
            toast({ variant: 'destructive', title: 'Not Authenticated', description: 'Anda harus login.' });
            return;
        }

        toast({
            title: 'Tindakan Disimpan',
            description: `Status laporan ${observation.referenceId || observation.id} sedang diperbarui.`,
        });

        try {
            const closerName = `${userProfile.displayName} (${userProfile.position || 'N/A'})`;
    
            const updatedData: Partial<Observation> = {
                status: 'Completed',
                actionTakenDescription: actionData.actionTakenDescription,
                closedBy: closerName,
                closedDate: new Date().toISOString(),
            };
            
            if (actionData.actionTakenPhoto) {
                const file = actionData.actionTakenPhoto;
                const actionTakenPhotoUrl = await uploadFile(file, 'actions', user.uid, () => {}, observation.projectId);
                updatedData.actionTakenPhotoUrl = actionTakenPhotoUrl;
            }
    
            const observationDocRef = getDocRef(observation);
            await updateDoc(observationDocRef, updatedData);
            
            toast({
                title: 'Sukses!',
                description: `Observasi ${observation.referenceId || observation.id} telah ditandai selesai.`,
            });
    
        } catch (error) {
            console.error("Failed to update observation: ", error);
            toast({
                variant: 'destructive',
                title: 'Update Gagal',
                description: error instanceof Error ? error.message : 'Tidak dapat memperbarui observasi.',
            });
        }
    }, [user, userProfile]);

    const deleteObservation = React.useCallback(async (observation: Observation) => {
        if (!user) {
            throw new Error('User is not authenticated.');
        }
        if (user.uid !== observation.userId) {
            throw new Error('You do not have permission to delete this observation.');
        }
        
        const docRef = getDocRef(observation);

        // Delete associated photos from storage first. These operations will not throw errors.
        await deleteFile(observation.photoUrl);
        await deleteFile(observation.actionTakenPhotoUrl);

        // Then delete the document from Firestore
        await deleteDoc(docRef);

    }, [user]);

    const deleteInspection = React.useCallback(async (inspection: Inspection) => {
        if (!user) {
            throw new Error('User is not authenticated.');
        }
        if (user.uid !== inspection.userId) {
            throw new Error('You do not have permission to delete this inspection.');
        }
        
        const docRef = getDocRef(inspection);

        await deleteFile(inspection.photoUrl);

        await deleteDoc(docRef);
    }, [user]);

    const deletePtw = React.useCallback(async (ptw: Ptw) => {
        if (!user) {
            throw new Error('User is not authenticated.');
        }
        if (user.uid !== ptw.userId) {
            throw new Error('You do not have permission to delete this PTW.');
        }
        
        const docRef = getDocRef(ptw);

        await deleteFile(ptw.jsaPdfUrl);

        await deleteDoc(docRef);
    }, [user]);


    const approvePtw = React.useCallback(async (ptw: Ptw, signatureDataUrl: string, approver: string) => {
        const ptwDocRef = getDocRef(ptw);
        await updateDoc(ptwDocRef, {
            status: 'Approved', signatureDataUrl, approver, approvedDate: new Date().toISOString(),
        });
    }, []);

    const retryAiAnalysis = React.useCallback(async (item: Observation | Inspection) => {
        const docRef = getDocRef(item);
        await updateDoc(docRef, { aiStatus: 'processing' });
        if (item.itemType === 'observation') {
            _runObservationAiAnalysis(item as Observation);
        } else if (item.itemType === 'inspection') {
            _runInspectionAiAnalysis(item as Inspection);
        }
    }, [_runObservationAiAnalysis, _runInspectionAiAnalysis]);

    const shareObservationToPublic = React.useCallback(async (observation: Observation) => {
        if (!user || !userProfile) {
          toast({ variant: 'destructive', title: 'User profile not loaded.', description: 'Please wait a moment and try again.'});
          throw new Error("User not authenticated or profile not loaded");
        }
        if (observation.isSharedPublicly) {
            toast({ variant: 'default', title: 'Sudah Dibagikan', description: 'Observasi ini sudah ada di feed publik.' });
            return;
        }

        try {
            // Create a clean public version, resetting status and action-related fields
            const publicObservationData: Omit<Observation, 'id'> = {
                itemType: 'observation',
                userId: observation.userId,
                location: observation.location,
                submittedBy: observation.submittedBy,
                date: new Date().toISOString(), // Use current date for public post
                findings: observation.findings,
                recommendation: observation.recommendation,
                riskLevel: observation.riskLevel,
                status: 'Pending', // Reset status for public feed
                category: observation.category,
                company: observation.company,
                photoUrl: observation.photoUrl,
                scope: 'public',
                projectId: null,
                referenceId: observation.referenceId,
                isSharedPublicly: false,
                sharedBy: userProfile.displayName,
                sharedByPosition: userProfile.position,
                originalId: observation.id, // If it's a shared copy, this points to the original
                originalScope: observation.scope,
                aiStatus: observation.aiStatus,
                aiSummary: observation.aiSummary,
                aiRisks: observation.aiRisks,
                aiSuggestedActions: observation.aiSuggestedActions,
                aiRelevantRegulations: observation.aiRelevantRegulations,
                aiSuggestedRiskLevel: observation.aiSuggestedRiskLevel,
                aiRootCauseAnalysis: observation.aiRootCauseAnalysis,
                aiObserverSkillRating: observation.aiObserverSkillRating,
                aiObserverSkillExplanation: observation.aiObserverSkillExplanation,
                likes: [],
                likeCount: 0,
                commentCount: 0,
                viewCount: 0,
                // Ensure action fields are not carried over
                actionTakenDescription: undefined,
                actionTakenPhotoUrl: undefined,
                closedBy: undefined,
                closedDate: undefined,
            };
            
            await addDoc(collection(db, 'observations'), publicObservationData);
    
            const originalDocRef = getDocRef(observation);
            await updateDoc(originalDocRef, { isSharedPublicly: true });
    
            toast({ title: 'Berhasil!', description: 'Observasi telah dibagikan ke feed publik.' });
        } catch (error) {
            console.error("Failed to share observation to public:", error);
            toast({ variant: 'destructive', title: 'Gagal Membagikan', description: 'Tidak dapat membagikan observasi. Silakan coba lagi.' });
        }
    }, [user, userProfile]);

    const toggleLikeObservation = React.useCallback(async (observation: Observation) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Anda harus masuk untuk menyukai.' });
            return;
        }
        try {
            await toggleLike({
                docId: observation.id,
                userId: user.uid,
                collectionName: 'observations',
            });
        } catch (error) {
            console.error('Failed to toggle like:', error);
            toast({ variant: 'destructive', title: 'Gagal', description: 'Tidak dapat memproses suka.'});
        }
    }, [user]);

    const incrementViewCount = React.useCallback(async (observationId: string) => {
        try {
            await incrementViewCountAction({
                docId: observationId,
                collectionName: 'observations',
            });
        } catch (error) {
            console.error('Failed to increment view count:', error);
            // Don't toast here as it's a background, non-critical task
        }
    }, []);

    const value = {
        privateItems,
        projectItems,
        loading: authLoading || projectsLoading || privateItemsLoading || projectItemsLoading,
        addObservation,
        addInspection,
        addPtw,
        updateObservation,
        deleteObservation,
        deleteInspection,
        deletePtw,
        approvePtw,
        retryAiAnalysis,
        shareObservationToPublic,
        toggleLikeObservation,
        incrementViewCount,
    };

    return (
        <ObservationContext.Provider value={value}>
        {children}
        </ObservationContext.Provider>
    );
}

export function useObservations() {
  const context = React.useContext(ObservationContext);
  if (context === undefined) {
    throw new Error('useObservations must be used within an ObservationProvider');
  }
  return context;
}
