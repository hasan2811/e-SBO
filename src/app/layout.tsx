
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { AppProviders } from '@/components/app-providers';
import '@/app/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'InspectWise Dashboard',
  description: 'HSSE Observation and Analysis Platform',
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#29ABE2', // Updated to match primary color from globals.css
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              #splash-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 100;
                opacity: 1;
                transition: opacity 0.5s ease-out;
                pointer-events: none; /* Allows clicks to pass through when hidden */
              }
              #splash-screen iframe {
                width: 100%;
                height: 100%;
                border: none;
              }
              .splash-hidden {
                opacity: 0 !important;
              }
            `,
          }}
        />
      </head>
      <body className={cn(inter.className, "antialiased")}>
        <div id="splash-screen">
            <iframe src="/splash.html" title="Loading HSSE Tech"></iframe>
        </div>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
