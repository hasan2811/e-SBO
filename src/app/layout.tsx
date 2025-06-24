import type {Metadata} from 'next';
import '@/app/globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/contexts/auth-context';
import { ObservationProvider } from '@/contexts/observation-context';

export const metadata: Metadata = {
  title: 'e-Observation Dashboard',
  description: 'Dashboard for viewing and managing observation data.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4A90E2" />
      </head>
      <body className={cn("font-body antialiased")}>
        <AuthProvider>
          <ObservationProvider>
            {children}
            <Toaster />
          </ObservationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
