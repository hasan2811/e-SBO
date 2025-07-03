
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useObservations } from '@/contexts/observation-context';
import { DashboardHeader } from '@/components/dashboard-header';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { Sidebar } from '@/components/sidebar';
import { SubmitObservationDialog } from '@/components/submit-observation-dialog';
import { CompleteProfileDialog } from '@/components/complete-profile-dialog';
import type { Observation, Inspection, Ptw, Scope, Project } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { MultiActionButton } from '@/components/multi-action-button';
import { SubmitInspectionDialog } from '@/components/submit-inspection-dialog';
import { SubmitPtwDialog } from '@/components/submit-ptw-dialog';
import { useCurrentProject } from '@/hooks/use-current-project';
import { useProjects } from '@/hooks/use-projects';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addObservation, addInspection, addPtw } = useObservations();
  const router = useRouter();
  const pathname = usePathname();

  const [isObservationDialogOpen, setObservationDialogOpen] = React.useState(false);
  const [isInspectionDialogOpen, setInspectionDialogOpen] = React.useState(false);
  const [isPtwDialogOpen, setPtwDialogOpen] = React.useState(false);
  const [isProfileDialogOpen, setProfileDialogOpen] = React.useState(false);

  const { projectId, setProjectId } = useCurrentProject();
  const { projects, loading: projectsLoading } = useProjects();

  const currentProject = React.useMemo(() => {
    if (!projectId || projectsLoading) return null;
    return projects.find(p => p.id === projectId) ?? null;
  }, [projectId, projects, projectsLoading]);

  React.useEffect(() => {
    // This effect ensures the global project context is aware of the current project ID
    // by looking at the URL path. This is still useful for other components like the dashboard.
    const match = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/);
    const currentId = match ? match[1] : null;
    if (currentId !== projectId) { // Only update if it changes
      setProjectId(currentId);
    }
  }, [pathname, projectId, setProjectId]);

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
  
  const showMultiActionButton = pathname.startsWith('/proyek/') || pathname === '/private';
  
  // These handlers now parse the projectId directly from the pathname to avoid race conditions
  const handleAddObservation = (formData: any) => {
    const match = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/);
    const submissionProjectId = match ? match[1] : null;
    const scope: Scope = submissionProjectId ? 'project' : 'private';
    addObservation(formData, scope, submissionProjectId);
  };

  const handleAddInspection = (formData: any) => {
    const match = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/);
    const submissionProjectId = match ? match[1] : null;
    const scope: Scope = submissionProjectId ? 'project' : 'private';
    addInspection(formData, scope, submissionProjectId);
  };

  const handleAddPtw = (formData: any) => {
    const match = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/);
    const submissionProjectId = match ? match[1] : null;
    const scope: Scope = submissionProjectId ? 'project' : 'private';
    addPtw(formData, scope, submissionProjectId);
  };


  return (
    <>
      <CompleteProfileDialog 
        isOpen={isProfileDialogOpen}
        onProfileComplete={() => setProfileDialogOpen(false)}
      />

      <div className="flex flex-col min-h-screen">
        <DashboardHeader 
          onNewObservation={() => setObservationDialogOpen(true)}
          onNewInspection={() => setInspectionDialogOpen(true)}
          onNewPtw={() => setPtwDialogOpen(true)}
        />
        <div className="flex-1 md:grid md:grid-cols-[220px_1fr]">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-28 md:pb-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto h-full">
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
        </div>
        <BottomNavBar />
      </div>

      {showMultiActionButton && (
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
        project={currentProject}
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
