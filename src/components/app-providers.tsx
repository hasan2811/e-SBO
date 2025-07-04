
'use client';

import { AuthProvider } from '@/contexts/auth-context';
import { ProjectProvider } from '@/contexts/project-context';
import { Toaster } from '@/components/ui/toaster';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProjectProvider>
          {children}
          <Toaster />
      </ProjectProvider>
    </AuthProvider>
  );
}
