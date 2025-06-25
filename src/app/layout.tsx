import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { AppProviders } from '@/components/app-providers';

import '@/app/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'e-Observation Dashboard',
  description: 'Dashboard for viewing and managing observation data.',
  themeColor: '#4A90E2',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, "antialiased")}>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
