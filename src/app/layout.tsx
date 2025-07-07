
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { AppProviders } from '@/components/app-providers';
import '@/app/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// SVG icon encoded as a Base64 data URI for maximum browser compatibility and to bypass caching issues.
const logoSvgDataUri = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjlBQkUyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDJMMiA2djVjMCA1LjU1IDMuODQgMTAuNzQgOSAxMiA1LjE2LTEuMjYgOS02LjQ1IDktMTJWNmwLTEwLTR6IiAvPjxwYXRoIGQ9Im05IDEyIDIgMiA0LTQiIC8+PC9zdmc+";


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
