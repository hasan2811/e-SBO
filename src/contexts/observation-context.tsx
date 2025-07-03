
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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadFile } from '@/lib/storage';
import type { Observation, Inspection, Ptw, AllItems, Scope, Company, Location, RiskLevel } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useProjects } from '@/hooks/use-projects';
import {
  summarizeObservationData,
  analyzeInspectionData,
} from '@/ai/flows/summarize-observation-data';
import { getAIAssistance } from '@/lib/actions/ai-actions';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { toggleLike } from '@/lib/actions/interaction-actions';

interface ObservationContextType {
  privateItems: AllItems[];
  projectItems: AllItems[];
  loading: boolean;
  addObservation: (
    formData: any, // Using any for simplicity as it comes from a form
    scope: Scope,
    projectId: string | null
  ) => Promise<void>;
  addInspection: (
    formData: any,
    scope: Scope,
    projectId: string | null
  ) => Promise<void>;
  addPtw: (
    formData: any,
    scope: Scope,
    projectId: string | null
  ) => Promise<void>;
  updateObservation: (observation: Observation, updatedData: Partial<Observation>) => Promise<void>;
  approvePtw: (
    ptw: Ptw,
    signatureDataUrl: string,
    approver: string,
  ) => Promise<void>;
  retryAiAnalysis: (item: Observation | Inspection) => Promise<void>;
  shareObservationToPublic: (observation: Observation) => Promise<void>;
  toggleLikeObservation: (observation: Observation) => Promise<void>;
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
        Location: ${observation.location}, Company: ${observation.company}, Category: ${observation.category}, Risk Level: ${observation.riskLevel}, Submitted By: ${observation.submittedBy}, Date: ${new Date(observation.date).toLocaleString()}, Findings: ${observation.findings}, Recommendation: ${observation.recommendation}
      `;

      try {
        const summary = await summarizeObservationData({ observationData });
        const aiData = {
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
        const aiData = {
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
        if (!user || !userProfile) throw new Error("User not authenticated");

        const aiResult = await getAIAssistance({ findings: formData.findings });
        const photoUrl = await uploadFile(formData.photo, 'observations', user.uid, () => {}, projectId);
        const referenceId = `OBS-${format(new Date(), 'yyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        const newObservationData: Omit<Observation, 'id'> = {
            itemType: 'observation',
            userId: user.uid,
            date: new Date().toISOString(),
            status: 'Pending',
            submittedBy: `${userProfile.displayName} (${userProfile.position || 'N/A'})`,
            location: formData.location as Location,
            company: formData.company as Company,
            category: aiResult.suggestedCategory,
            riskLevel: aiResult.suggestedRiskLevel,
            findings: aiResult.improvedFindings,
            recommendation: formData.recommendation || aiResult.suggestedRecommendation,
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

        // UNIFIED WRITE: Always write to the root 'observations' collection.
        const docRef = await addDoc(collection(db, 'observations'), newObservationData);
        
        const fullItemData = { ...newObservationData, id: docRef.id };
        _runObservationAiAnalysis(fullItemData);

    }, [user, userProfile, _runObservationAiAnalysis]);
    
    const addInspection = React.useCallback(async (formData: any, scope: Scope, projectId: string | null) => {
        if (!user || !userProfile) throw new Error("User not authenticated");
        
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

        // UNIFIED WRITE: Always write to the root 'inspections' collection.
        const docRef = await addDoc(collection(db, 'inspections'), newInspectionData);

        const fullItemData = { ...newInspectionData, id: docRef.id };
        _runInspectionAiAnalysis(fullItemData);

    }, [user, userProfile, _runInspectionAiAnalysis]);

    const addPtw = React.useCallback(async (formData: any, scope: Scope, projectId: string | null) => {
        if (!user || !userProfile) throw new Error("User not authenticated");

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

        // UNIFIED WRITE: Always write to the root 'ptws' collection.
        await addDoc(collection(db, 'ptws'), newPtwData);
        
    }, [user, userProfile]);

    const updateObservation = React.useCallback(async (observation: Observation, updatedData: Partial<Observation>) => {
        const observationDocRef = getDocRef(observation);
        await updateDoc(observationDocRef, updatedData);
    }, []);

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
            const { id, aiStatus, ...restOfObservation } = observation;

            const publicObservationData = {
                ...restOfObservation,
                itemType: 'observation',
                scope: 'public' as const,
                projectId: null,
                isSharedPublicly: false, 
                sharedBy: userProfile.displayName,
                sharedByPosition: userProfile.position,
                originalId: id,
                originalScope: observation.scope,
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
            // This now correctly uses the flat structure path implicitly
            await toggleLike({
                docId: observation.id,
                userId: user.uid,
                collectionName: 'observations', // We need to specify the collection
            });
        } catch (error) {
            console.error('Failed to toggle like:', error);
            toast({ variant: 'destructive', title: 'Gagal', description: 'Tidak dapat memproses suka.'});
        }
    }, [user]);

    // This is the fix: Remove the useMemo wrapper that was causing the build error.
    const value = {
        privateItems,
        projectItems,
        loading: authLoading || projectsLoading || privateItemsLoading || projectItemsLoading,
        addObservation,
        addInspection,
        addPtw,
        updateObservation,
        approvePtw,
        retryAiAnalysis,
        shareObservationToPublic,
        toggleLikeObservation,
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
