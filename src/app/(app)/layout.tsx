
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { DashboardHeader } from '@/components/dashboard-header';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { Sidebar } from '@/components/sidebar';
import { SubmitObservationDialog } from '@/components/submit-observation-dialog';
import { CompleteProfileDialog } from '@/components/complete-profile-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { SubmitInspectionDialog } from '@/components/submit-inspection-dialog';
import { SubmitPtwDialog } from '@/components/submit-ptw-dialog';
import { useProjects } from '@/hooks/use-projects';
import { PageSkeleton } from '@/components/page-skeleton';
import { MultiActionButton } from '@/components/multi-action-button';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { projects, loading: projectsLoading } = useProjects();

  const [isObservationDialogOpen, setObservationDialogOpen] = React.useState(false);
  const [isInspectionDialogOpen, setInspectionDialogOpen] = React.useState(false);
  const [isPtwDialogOpen, setPtwDialogOpen] = React.useState(false);
  const [isProfileDialogOpen, setProfileDialogOpen] = React.useState(false);

  const getProjectIdFromPath = () => {
    const match = pathname.match(/\/proyek\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }
  
  const projectId = getProjectIdFromPath();

  const currentProject = React.useMemo(() => {
    if (!projectId || projectsLoading) return null;
    return projects.find(p => p.id === projectId) ?? null;
  }, [projectId, projects, projectsLoading]);

  // --- Redirection Logic ---
  React.useEffect(() => {
    if (authLoading || projectsLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }
    
    // Redirect from root to the hub.
    if (pathname === '/') {
        router.replace('/beranda');
        return;
    }
    
    const hasProjects = projects.length > 0;
    // If the user has no projects and is NOT on the hub page, redirect them there.
    if (!hasProjects && pathname !== '/beranda') {
        router.replace('/beranda');
    }
    // No other redirects are necessary. A user with projects can be on /beranda or /proyek/*

  }, [user, authLoading, projects, projectsLoading, pathname, router]);

  React.useEffect(() => {
    if (userProfile && (userProfile.position === 'Not Set' || !userProfile.position)) {
      setProfileDialogOpen(true);
    } else {
      setProfileDialogOpen(false);
    }
  }, [userProfile]);

  const isAppLoading = authLoading || (user && projectsLoading);
  const showMainContent = !isAppLoading && user;

  if (isAppLoading) {
    return <PageSkeleton withHeader />;
  }
  
  if (!user) {
     return <PageSkeleton />; // Show skeleton during redirect to login
  }

  const variants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
  };
  
  return (
    <>
      <CompleteProfileDialog 
        isOpen={isProfileDialogOpen}
        onProfileComplete={() => setProfileDialogOpen(false)}
      />

      <div className="flex flex-col min-h-screen bg-secondary/50">
        <DashboardHeader />
        <div className="flex-1 md:grid md:grid-cols-[220px_1fr]">
          {projectId && <Sidebar projectId={projectId} />}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-28 md:pb-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={variants}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                >
                  {showMainContent && !isProfileDialogOpen && children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
        
        {projectId && (
          <>
            <MultiActionButton
                onNewObservation={() => setObservationDialogOpen(true)}
                onNewInspection={() => setInspectionDialogOpen(true)}
                onNewPtw={() => setPtwDialogOpen(true)}
            />
            <BottomNavBar projectId={projectId} />
          </>
        )}
      </div>
      
      {currentProject && (
          <>
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
      )}
    </>
  );
}
