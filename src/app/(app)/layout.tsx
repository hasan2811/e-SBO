
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { DashboardHeader } from '@/components/dashboard-header';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { Sidebar } from '@/components/sidebar';
import { SubmitObservationDialog } from '@/components/submit-observation-dialog';
import { CompleteProfileDialog } from '@/components/complete-profile-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { MultiActionButton } from '@/components/multi-action-button';
import { SubmitInspectionDialog } from '@/components/submit-inspection-dialog';
import { SubmitPtwDialog } from '@/components/submit-ptw-dialog';
import { useProjects } from '@/hooks/use-projects';
import type { Project } from '@/lib/types';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isObservationDialogOpen, setObservationDialogOpen] = React.useState(false);
  const [isInspectionDialogOpen, setInspectionDialogOpen] = React.useState(false);
  const [isPtwDialogOpen, setPtwDialogOpen] = React.useState(false);
  const [isProfileDialogOpen, setProfileDialogOpen] = React.useState(false);

  const { projects, loading: projectsLoading } = useProjects();
  
  const getProjectIdFromPath = () => {
    const match = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  const currentProject = React.useMemo(() => {
    const projectId = getProjectIdFromPath();
    if (!projectId || projectsLoading) return null;
    return projects.find(p => p.id === projectId) ?? null;
  }, [pathname, projects, projectsLoading]);


  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  React.useEffect(() => {
    // Open the profile dialog only if the user profile is loaded and the position is not set.
    if (userProfile && (userProfile.position === 'Not Set' || !userProfile.position)) {
      setProfileDialogOpen(true);
    } else {
      setProfileDialogOpen(false);
    }
  }, [userProfile]);

  // Combine loading states: show spinner if auth is loading, or if we have a user but their projects are still loading.
  const isAppLoading = authLoading || (!!user && projectsLoading);

  if (isAppLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // If loading is finished but there's no user, the redirect effect will handle it.
  // Render nothing in the meantime to avoid a flash of content.
  if (!user) {
    return null;
  }

  const variants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };
  
  const showMultiActionButton = pathname.startsWith('/proyek/') || pathname.startsWith('/private');

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
                  {/* Don't render children if profile dialog is forced open */}
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
        project={currentProject}
      />
      <SubmitInspectionDialog
        isOpen={isInspectionDialogOpen}
        onOpenChange={setInspectionDialogOpen}
        project={currentProject}
      />
      <SubmitPtwDialog
        isOpen={isPtwDialogOpen}
        onOpenChange={setPtwDialogOpen}
        project={currentProject}
      />
    </>
  );
}
