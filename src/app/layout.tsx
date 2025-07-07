
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { AppProviders } from '@/components/app-providers';
import '@/app/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// SVG icon as a data URI to prevent browser caching issues
const logoSvgDataUri = "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2329ABE2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpath d='M12 2L2 6v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-10-4z' /%3e%3cpath d='m9 12 2 2 4-4' /%3e%3c/svg%3e";

export const metadata: Metadata = {
  title: 'HSSE Tech Platform',
  description: 'HSSE Observation and Analysis Platform',
  icons: {
    icon: logoSvgDataUri,
    shortcut: logoSvgDataUri,
    apple: logoSvgDataUri,
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
