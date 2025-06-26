'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useObservations } from '@/contexts/observation-context';
import { DashboardHeader } from '@/components/dashboard-header';
import { BottomNavBar } from '@/components/bottom-nav-bar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { addObservation } = useObservations();
  const router = useRouter();
  const pathname = usePathname();

  const isDetailPage = pathname.startsWith('/observation/');

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {!isDetailPage && <DashboardHeader onAddObservation={addObservation} />}
      <main className={`flex-1 p-4 md:p-8 ${isDetailPage ? '' : 'pb-28 md:pb-8'}`}>
        <div className={isDetailPage ? 'max-w-4xl mx-auto h-full' : 'max-w-4xl mx-auto'}>
          {children}
        </div>
      </main>
      {!isDetailPage && <BottomNavBar />}
    </div>
  );
}
