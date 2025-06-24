'use client';

import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { Loader2 } from 'lucide-react';

import '@/app/globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/contexts/auth-context';
import { useAuth } from '@/hooks/use-auth';
import { ObservationProvider, useObservations } from '@/contexts/observation-context';
import { DashboardHeader } from '@/components/dashboard-header';
import { BottomNavBar } from '@/components/bottom-nav-bar';

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { addObservation } = useObservations();
  const router = useRouter();
  
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader onAddObservation={addObservation} />
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <BottomNavBar onAddObservation={addObservation} />
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isPublicPage = ['/login', '/register'].includes(pathname);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>e-Observation Dashboard</title>
        <meta name="description" content="Dashboard for viewing and managing observation data." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4A90E2" />
      </head>
      <body className={cn("font-body antialiased")}>
        <AuthProvider>
          <ObservationProvider>
            {isPublicPage ? children : <AppShell>{children}</AppShell>}
            <Toaster />
          </ObservationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
