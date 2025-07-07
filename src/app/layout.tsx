
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { AppProviders } from '@/components/app-providers';
import '@/app/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// SVG icon as a more robustly encoded data URI to force browsers to update the favicon
const logoSvgDataUri = "data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%2329ABE2%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27M12%202L2%206v5c0%205.55%203.84%2010.74%209%2012%205.16-1.26%209-6.45%209-12V6l-10-4z%27%20%2F%3E%3Cpath%20d%3D%27m9%2012%202%202%204-4%27%20%2F%3E%3C%2Fsvg%3E";


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
