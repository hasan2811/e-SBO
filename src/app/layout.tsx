
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { AppProviders } from '@/components/app-providers';
import '@/app/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// Using URL-encoded SVG for the favicon to ensure cache busting and compatibility.
const logoSvgDataUri = "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10' fill='%2329ABE2' stroke='%2329ABE2'/%3e%3cpath d='m9 12 2 2 4-4' stroke='white'/%3e%3c/svg%3e";


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
