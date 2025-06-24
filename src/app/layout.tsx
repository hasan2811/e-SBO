'use client';

import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { Inter } from 'next/font/google';
import { Loader2 } from 'lucide-react';

import '@/app/globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/contexts/auth-context';
import { useAuth } from '@/hooks/use-auth';
import { ObservationProvider, useObservations } from '@/contexts/observation-context';
import { DashboardHeader } from '@/components/dashboard-header';
import { BottomNavBar } from '@/components/bottom-nav-bar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { addObservation } = useObservations();
  const router = useRouter();
  
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader onAddObservation={addObservation} />
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
        {authLoading || !user ? (
          <div className="flex items-center justify-center h-full pt-16">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        )}
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4A90E2" />
      </head>
      <body className={cn(inter.variable, "font-body antialiased")}>
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
