
'use client';

import { AuthProvider } from '@/contexts/auth-context';
import { ObservationProvider } from '@/contexts/observation-context';
import { ProjectProvider } from '@/contexts/project-context';
import { CurrentProjectProvider } from '@/contexts/current-project-context';
import { Toaster } from '@/components/ui/toaster';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProjectProvider>
        <CurrentProjectProvider>
          <ObservationProvider>
            {children}
            <Toaster />
          </ObservationProvider>
        </CurrentProjectProvider>
      </ProjectProvider>
    </AuthProvider>
  );
}
