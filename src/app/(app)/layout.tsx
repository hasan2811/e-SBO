
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { DashboardHeader } from '@/components/dashboard-header';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { Sidebar } from '@/components/sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjects } from '@/hooks/use-projects';
import { MultiActionButton } from '@/components/multi-action-button';
import { usePerformance } from '@/contexts/performance-context';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ProjectProvider } from '@/contexts/project-context';
import { ObservationProvider } from '@/contexts/observation-context';


// Dynamically import heavy dialogs to reduce initial bundle size
const CompleteProfileDialog = dynamic(() => import('@/components/complete-profile-dialog').then(mod => mod.CompleteProfileDialog), { ssr: false });
const SubmitObservationDialog = dynamic(() => import('@/components/submit-observation-dialog').then(mod => mod.SubmitObservationDialog), { ssr: false });
const SubmitInspectionDialog = dynamic(() => import('@/components/submit-inspection-dialog').then(mod => mod.SubmitInspectionDialog), { ssr: false });
const SubmitPtwDialog = dynamic(() => import('@/components/submit-ptw-dialog').then(mod => mod.SubmitPtwDialog), { ssr: false });


function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { projects, loading: projectsLoading } = useProjects();
  const { isFastConnection } = usePerformance();

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
    if (!projectId) return null;
    return projects.find(p => p.id === projectId) ?? null;
  }, [projectId, projects]);

  const isAppLoading = authLoading || (user && projectsLoading);
  
  // --- Redirection Logic & Splash Screen Control ---
  React.useEffect(() => {
    if (authLoading) return; // Wait until authentication check is complete

    // Hide splash screen once the app is no longer loading data.
    if (!isAppLoading) {
        const splash = document.getElementById('splash-screen');
        if (splash) {
          splash.classList.add('splash-hidden');
        }
    }

    // 1. If not authenticated, redirect to login page.
    if (!user) {
      router.push('/login');
      return;
    }

    // 2. If authenticated, check if profile needs completion.
    if (userProfile && (userProfile.position === 'Not Set' || !userProfile.position)) {
      setProfileDialogOpen(true);
    } else {
      setProfileDialogOpen(false);
    }
  }, [user, userProfile, authLoading, isAppLoading, router]);

  
  if (!user) {
    // While redirecting to login, the splash screen remains visible,
    // so we don't need to render a separate loader here.
    // This return is a fallback.
    return null;
  }

  const variants = {
    initial: { opacity: isFastConnection ? 0 : 1, y: isFastConnection ? 15 : 0 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: isFastConnection ? 0 : 1, y: isFastConnection ? -15 : 0 },
  };

  const transition = {
    duration: isFastConnection ? 0.2 : 0,
    ease: 'easeInOut'
  };
  
  return (
    <>
      <div className="flex flex-col min-h-screen bg-secondary/50">
        <DashboardHeader />
        <div className="flex-1 md:grid md:grid-cols-[220px_1fr]">
          {projectId && <Sidebar projectId={projectId} />}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-28 md:pb-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={variants}
                  transition={transition}
                >
                  {/* The splash screen covers content while loading, so we don't need a skeleton here. */}
                  {!isAppLoading && !isProfileDialogOpen && children}
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
      
      {/* Dialogs are outside the main layout flow and only rendered when needed */}
      {isProfileDialogOpen && (
        <CompleteProfileDialog 
          isOpen={isProfileDialogOpen}
          onProfileComplete={() => setProfileDialogOpen(false)}
        />
      )}

      {currentProject && (
          <>
            {isObservationDialogOpen && (
              <SubmitObservationDialog
                  isOpen={isObservationDialogOpen}
                  onOpenChange={setObservationDialogOpen}
                  project={currentProject}
              />
            )}
            {isInspectionDialogOpen && (
              <SubmitInspectionDialog
                  isOpen={isInspectionDialogOpen}
                  onOpenChange={setInspectionDialogOpen}
                  project={currentProject}
              />
            )}
            {isPtwDialogOpen && (
              <SubmitPtwDialog
                  isOpen={isPtwDialogOpen}
                  onOpenChange={setPtwDialogOpen}
                  project={currentProject}
              />
            )}
          </>
      )}
    </>
  );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <ObservationProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </ObservationProvider>
    </ProjectProvider>
  );
}
