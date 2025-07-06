
'use client';

import { AuthProvider } from '@/contexts/auth-context';
import { PerformanceProvider } from '@/contexts/performance-context';
import { Toaster } from '@/components/ui/toaster';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PerformanceProvider>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </PerformanceProvider>
  );
}
