import * as React from 'react';
import { cn } from '@/lib/utils';

interface AppLogoProps extends React.SVGProps<SVGSVGElement> {}

export function AppLogo({ className, ...props }: AppLogoProps) {
  return (
    <svg
      className={cn("h-8 w-auto text-primary", className)}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" />
      <path
        d="M32 24C32 28.4183 28.4183 32 24 32C19.5817 32 16 28.4183 16 24"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M16 24H30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
