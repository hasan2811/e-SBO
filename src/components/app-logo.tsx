
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  className?: string;
}

export function AppLogo({ className }: AppLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-8 w-8', className)}
    >
      <title>HSSE Tech Logo</title>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" className="fill-primary stroke-primary" />
      <path d="m9 12 2 2 4-4" className="stroke-primary-foreground fill-none" />
    </svg>
  );
}
