
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useObservations } from '@/contexts/observation-context';
import { DashboardHeader } from '@/components/dashboard-header';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { SubmitObservationDialog } from '@/components/submit-observation-dialog';
import { CompleteProfileDialog } from '@/components/complete-profile-dialog';
import type { Observation, Inspection, Ptw, Scope } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { MultiActionButton } from '@/components/multi-action-button';
import { SubmitInspectionDialog } from '@/components/submit-inspection-dialog';
import { SubmitPtwDialog } from '@/components/submit-ptw-dialog';
import { useCurrentProject } from '@/hooks/use-current-project';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addObservation, addInspection, addPtw } = useObservations();
  const router = useRouter();
  const pathname = usePathname();

  const [isObservationDialogOpen, setObservationDialogOpen] = React.useState(false);
  const [isInspectionDialogOpen, setInspectionDialogOpen] = React.useState(false);
  const [isPtwDialogOpen, setPtwDialogOpen] = React.useState(false);
  const [isProfileDialogOpen, setProfileDialogOpen] = React.useState(false);

  const { projectId } = useCurrentProject();

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  React.useEffect(() => {
    if (userProfile && (userProfile.position === 'Not Set' || !userProfile.position)) {
      setProfileDialogOpen(true);
    } else {
      setProfileDialogOpen(false);
    }
  }, [userProfile]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const variants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };
  
  const isPublicFeed = pathname === '/';
  const isProjectFeed = pathname.startsWith('/proyek/');
  
  const getCurrentScope = (): { scope: Scope; projectId: string | null } => {
    if (isProjectFeed) {
      return { scope: 'project', projectId };
    }
    // All other authenticated pages default to private submissions
    return { scope: 'private', projectId: null };
  };
  
  const handleAddObservation = async (formData: Omit<Observation, 'id' | 'scope' | 'projectId'>) => {
    const { scope, projectId: submissionProjectId } = getCurrentScope();
    await addObservation(formData, scope, submissionProjectId);
  };

  const handleAddInspection = async (formData: Omit<Inspection, 'id' | 'scope' | 'projectId'>) => {
    const { scope, projectId: submissionProjectId } = getCurrentScope();
    await addInspection(formData, scope, submissionProjectId);
  };

  const handleAddPtw = async (formData: Omit<Ptw, 'id' | 'scope' | 'projectId'>) => {
    const { scope, projectId: submissionProjectId } = getCurrentScope();
    await addPtw(formData, scope, submissionProjectId);
  };


  return (
    <>
      <CompleteProfileDialog 
        isOpen={isProfileDialogOpen}
        onProfileComplete={() => setProfileDialogOpen(false)}
      />

      <div className="flex flex-col min-h-screen">
        <DashboardHeader onAddNew={() => setObservationDialogOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-28 md:pb-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {!isProfileDialogOpen && children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        <BottomNavBar />
      </div>

      {!isPublicFeed && (
        <MultiActionButton
          onObservationClick={() => setObservationDialogOpen(true)}
          onInspectionClick={() => setInspectionDialogOpen(true)}
          onPtwClick={() => setPtwDialogOpen(true)}
        />
      )}

      <SubmitObservationDialog
        isOpen={isObservationDialogOpen}
        onOpenChange={setObservationDialogOpen}
        onAddObservation={handleAddObservation}
      />
      <SubmitInspectionDialog
        isOpen={isInspectionDialogOpen}
        onOpenChange={setInspectionDialogOpen}
        onAddInspection={handleAddInspection}
      />
      <SubmitPtwDialog
        isOpen={isPtwDialogOpen}
        onOpenChange={setPtwDialogOpen}
        onAddPtw={handleAddPtw}
      />
    </>
  );
}
